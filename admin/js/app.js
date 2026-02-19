import { config } from './config.js';

// Initialize Supabase
const supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);

// State
let state = {
    user: null,
    districts: [],
    currentPage: 1,
    pageSize: 10,
    filters: {
        search: '',
        district: ''
    }
};

// DOM Elements
const views = {
    login: document.getElementById('loginView'),
    dashboard: document.getElementById('dashboardView')
};

// ==================== AUTHENTICATION ====================

async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        handleLoginSuccess(session.user);
    } else {
        showLogin();
    }
}

function showLogin() {
    views.login.classList.remove('d-none');
    views.dashboard.classList.add('d-none');
}

async function handleLoginSuccess(user) {
    state.user = user;

    // Fetch Profile for Role
    let role = 'pending';
    let district = null;

    try {
        const { data, error } = await supabase.from('profiles').select('role, assigned_district').eq('id', user.id).single();
        if (data) {
            role = data.role;
            district = data.assigned_district;
        } else {
            console.warn('No profile found for user');
        }
    } catch (err) {
        console.error('Profile fetch error', err);
    }

    // Show Pending Screen if needed
    if (role === 'pending' || (role !== 'admin' && role !== 'super_admin')) {
        document.body.innerHTML = `
            <div class="d-flex justify-content-center align-items-center vh-100 bg-light">
                <div class="card p-5 text-center shadow-sm">
                    <h2 class="text-warning mb-3"><i class="fa-solid fa-clock"></i></h2>
                    <h3>Approval Pending</h3>
                    <p class="text-secondary">Your account is waiting for Super Admin approval.</p>
                    <button class="btn btn-outline-danger mt-3" onclick="window.location.reload()">Refresh / Logout</button>
                    <button class="btn btn-link text-muted mt-2" id="logoutBtnPending">Logout</button>
                </div>
            </div>
        `;
        document.getElementById('logoutBtnPending').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload();
        });
        return;
    }

    document.getElementById('userEmailDisplay').innerHTML = `
        <span class="text-secondary fw-normal small">Logged in as:</span> ${user.email} 
        <span class="badge bg-primary ms-1">${role === 'super_admin' ? 'Super Admin' : 'Admin'}</span>
    `;

    views.login.classList.add('d-none');
    views.dashboard.classList.remove('d-none');

    // Manage Users Tab (Super Admin Only)
    if (role === 'super_admin') {
        const headerActions = document.getElementById('adminActions');
        if (headerActions) {
            // 1. CSV Upload Button
            if (!document.getElementById('btnCsvUpload')) {
                const btnCsv = document.createElement('button');
                btnCsv.id = 'btnCsvUpload';
                btnCsv.className = 'btn btn-success me-2';
                btnCsv.innerHTML = '<i class="fa-solid fa-file-csv"></i> Import CSV';
                btnCsv.onclick = () => {
                    const modalEl = document.getElementById('csvModal');
                    if (modalEl) {
                        new bootstrap.Modal(modalEl).show();
                    } else {
                        createCsvModal();
                    }
                };
                headerActions.insertBefore(btnCsv, headerActions.firstChild);
            }

            // 2. Manage Users Button
            if (!document.getElementById('btnManageUsers')) {
                const btnUsers = document.createElement('button');
                btnUsers.id = 'btnManageUsers';
                btnUsers.className = 'btn btn-dark me-2';
                btnUsers.innerHTML = '<i class="fa-solid fa-users"></i> Manage Users';
                btnUsers.onclick = window.openUserManagement;
                headerActions.insertBefore(btnUsers, headerActions.firstChild);
            }
        }
    }

    // RBAC: Lock District Filter for District Admins
    const filterSelect = document.getElementById('districtFilter');
    if (role === 'admin' && district) {
        state.filters.district = district;
        state.userDistrict = district; // Store for validaton

        // We'll enforce this value after loading districts
        filterSelect.disabled = true;
        filterSelect.title = "Restricted to your assigned district";
    }

    // Initial Data Load
    loadDistricts(role, district);
    loadStudents();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = e.target.querySelector('button');
    const errorDiv = document.getElementById('loginError');

    // UI Loading
    btn.disabled = true;
    document.getElementById('loginSpinner').classList.remove('d-none');
    document.getElementById('loginBtnText').textContent = 'Signing in...';
    errorDiv.classList.add('d-none');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('d-none');
        btn.disabled = false;
        document.getElementById('loginSpinner').classList.add('d-none');
        document.getElementById('loginBtnText').textContent = 'Sign In';
    } else {
        handleLoginSuccess(data.user);
    }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
});

// ==================== DATA MANAGEMENT ====================

// Load Unique Districts for Filter
async function loadDistricts(role, userDistrict) {
    try {
        const { data, error } = await supabase.rpc('get_unique_districts');
        if (error) throw error;

        state.districts = data.map(d => d.dist_name || d.District).sort();

        // Populate Filter Dropdown
        const filterSelect = document.getElementById('districtFilter');
        filterSelect.innerHTML = '<option value="">All Districts</option>' +
            state.districts.map(d => `<option value="${d}">${d}</option>`).join('');

        // RBAC Enforcement
        if (role === 'admin' && userDistrict) {
            filterSelect.value = userDistrict;
            state.filters.district = userDistrict;
        }

        // Populate Modal Datalist
        const datalist = document.getElementById('districtSuggestions');
        datalist.innerHTML = state.districts.map(d => `<option value="${d}">`).join('');

    } catch (err) {
        console.error('Failed to load districts:', err);
    }
}

// ==================== STUDENT DATA & TABLE ====================
async function loadStudents(page = 1) {
    // Correct ID: studentsTableBody (Plural)
    const tbody = document.getElementById('studentsTableBody');
    const totalCountEl = document.getElementById('totalCount');

    // Pagination Elements
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageSpan = document.getElementById('currentPage');

    if (!tbody) { console.error('Table body not found!'); return; }

    tbody.innerHTML = '<tr><td colspan="8" class="text-center">Loading data...</td></tr>';

    // Calculate Range
    const from = (page - 1) * state.pageSize;
    const to = from + state.pageSize - 1;

    try {
        let data, count, error;

        // SMART SEARCH: Use RPC if searching
        if (state.filters.search && state.filters.search.trim().length > 0) {
            const term = state.filters.search.trim();
            const rpcParams = { term: term };

            let query = supabase.rpc('search_students', rpcParams);

            if (state.filters.district) {
                query = query.eq('District', state.filters.district);
            }

            const res = await query;
            data = res.data || [];
            error = res.error;
            count = data.length;

            const allData = data;
            data = allData.slice(from, from + state.pageSize);

        } else {
            // STANDARD FETCH
            let query = supabase
                .from('students')
                .select('*', { count: 'exact' });

            if (state.filters.district) {
                query = query.eq('District', state.filters.district);
            }

            // Fallback ordering
            query = query.order('VEC Exam Code', { ascending: true }).range(from, to);

            const res = await query;
            data = res.data;
            count = res.count;
            error = res.error;
        }

        if (error) throw error;

        state.currentPage = page;
        state.totalRecords = count;

        if (totalCountEl) totalCountEl.textContent = `${count} Records`;

        renderTable(data, tbody);

        // Update Pagination Controls
        const totalPages = Math.ceil(count / state.pageSize) || 1;

        if (pageSpan) pageSpan.textContent = `${page} / ${totalPages}`;

        if (prevBtn) {
            prevBtn.disabled = page <= 1;
            prevBtn.onclick = () => loadStudents(page - 1);
        }

        if (nextBtn) {
            nextBtn.disabled = page >= totalPages;
            nextBtn.onclick = () => loadStudents(page + 1);
        }

    } catch (err) {
        console.error('Data Load Error:', err);
        tbody.innerHTML = `<tr><td colspan="8" class="text-danger text-center">Error loading data: ${err.message}</td></tr>`;
    }
}

function highlightMatch(text, term) {
    if (!text) return '';
    const str = String(text);
    if (!term) return str;
    const regex = new RegExp(`(${term})`, 'gi');
    return str.replace(regex, '<mark class="bg-warning text-dark p-0">$1</mark>');
}

function renderTable(data, tbody) {
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No records found.</td></tr>';
        return;
    }

    const searchTerm = state.filters.search ? state.filters.search.trim() : '';

    tbody.innerHTML = data.map(s => `
        <tr>
            <td>${highlightMatch(s['Name of Student'], searchTerm)}</td>
            <td>${highlightMatch(s['VEC Exam Code'], searchTerm)}</td>
            <td>${highlightMatch(s['Mobile Number'], searchTerm)}</td>
            <td>${s['District']}</td>
            <td>${s['Result Grades'] || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="window.editStudent('${s['VEC Exam Code']}')">
                    <i class="fa-solid fa-pen"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getGradeBadgeClass(grade) {
    if (!grade) return 'bg-secondary text-white';
    if (grade.includes('A')) return 'badge-success';
    if (grade === 'Passing') return 'badge-warning';
    return 'bg-light text-dark border';
}

function updatePagination(totalCount) {
    document.getElementById('totalCount').textContent = `${totalCount} Records`;
    document.getElementById('currentPage').textContent = state.currentPage;

    const totalPages = Math.ceil(totalCount / state.pageSize);
    document.getElementById('prevPageBtn').disabled = state.currentPage === 1;
    document.getElementById('nextPageBtn').disabled = state.currentPage >= totalPages;
}

// ==================== UI ACTIONS ====================

// Filter Actions
window.applyFilters = () => {
    state.filters.search = document.getElementById('searchInput').value;
    state.filters.district = document.getElementById('districtFilter').value;
    state.currentPage = 1;
    loadStudents();
};

window.clearFilters = () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('districtFilter').value = '';
    state.filters.search = '';
    state.filters.district = '';
    state.currentPage = 1;
    loadStudents();
};

//    // Filter Listeners
document.getElementById('districtFilter').addEventListener('change', (e) => {
    state.filters.district = e.target.value;
    loadStudents(1);
});

const searchInput = document.getElementById('searchInput');
let debounceTimer;

// Live Search with Debounce
searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        state.filters.search = e.target.value;
        loadStudents(1);
    }, 300); // 300ms delay
});

// Also trigger on Enter (immediate)
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        clearTimeout(debounceTimer);
        state.filters.search = e.target.value;
        loadStudents(1);
    }
});

// Pagination Listeners handled in loadStudents directly now via onclick assignments

// Modal & CRUD
const studentModal = new bootstrap.Modal(document.getElementById('studentModal'));

window.openAddModal = () => {
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').value = ''; // We will use this hidden field to store ORIGINAL Exam Code for updates
    document.getElementById('modalTitle').textContent = 'Add New Student';

    // RBAC: Pre-fill district if admin
    if (state.userDistrict) {
        const distInput = document.getElementById('district');
        distInput.value = state.userDistrict;
        distInput.readOnly = true; // Lock it
        distInput.classList.add('bg-light');
    }

    studentModal.show();
};

window.editStudent = async (code) => {
    try {
        // Fetch single student details
        const { data, error } = await supabase.from('students').select('*').eq('VEC Exam Code', code).single();
        if (error) throw error;

        // Populate Form
        document.getElementById('studentId').value = data['VEC Exam Code']; // Store original code to identify record
        document.getElementById('studentName').value = data['Name of Student'];
        document.getElementById('examCode').value = data['VEC Exam Code'];
        document.getElementById('mobileNumber').value = data['Mobile Number'];
        document.getElementById('district').value = data['District'];
        document.getElementById('schoolName').value = data['School Name'];
        document.getElementById('standard').value = data['Standard/Class'];
        document.getElementById('resultGrade').value = data['Result Grades'];

        document.getElementById('modalTitle').textContent = 'Edit Student';
        studentModal.show();

    } catch (err) {
        showToast('Error', 'Error loading student details', 'error');
        console.error(err);
    }
};

window.saveStudent = async () => {
    const originalCode = document.getElementById('studentId').value;
    const studentData = {
        'Name of Student': document.getElementById('studentName').value,
        'VEC Exam Code': document.getElementById('examCode').value, // New code (might be same as original)
        'Mobile Number': document.getElementById('mobileNumber').value,
        'District': document.getElementById('district').value,
        'School Name': document.getElementById('schoolName').value,
        'Standard/Class': document.getElementById('standard').value,
        'Result Grades': document.getElementById('resultGrade').value
    };

    try {
        let result;
        if (originalCode) {
            // Update
            result = await supabase.from('students').update(studentData).eq('VEC Exam Code', originalCode);
        } else {
            // Insert
            result = await supabase.from('students').insert([studentData]);
        }

        if (result.error) throw result.error;

        studentModal.hide();
        loadStudents(); // Refresh table
        showToast('Success', originalCode ? 'Student updated successfully!' : 'Student added successfully!', 'success');

    } catch (err) {
        console.error('Error saving student:', err);
        showToast('Error', 'Failed to save student: ' + err.message, 'error');
    }
};

window.showToast = (title, message, type = 'info') => {
    const toastEl = document.getElementById('liveToast');
    const toast = new bootstrap.Toast(toastEl);

    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastMessage').textContent = message;

    // Optional: Change header color based on type
    const header = toastEl.querySelector('.toast-header');
    header.className = 'toast-header'; // Reset
    if (type === 'success') header.classList.add('bg-success', 'text-white');
    else if (type === 'error') header.classList.add('bg-danger', 'text-white');

    toast.show();
};

// ==================== USER MANAGEMENT (Super Admin) ====================
window.openUserManagement = async () => {
    // Create User List Modal
    let modalEl = document.getElementById('userModal');
    if (!modalEl) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="userModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Manage Users</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <table class="table table-bordered table-striped align-middle">
                                <thead class="table-light"><tr><th>Email</th><th>Role</th><th>Districts</th><th>Action</th></tr></thead>
                                <tbody id="userTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `);
        modalEl = document.getElementById('userModal');
    }

    // Create Edit User Modal (Nested)
    let editModalEl = document.getElementById('editUserModal');
    if (!editModalEl) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="editUserModal" tabindex="-1" style="z-index: 1060;">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Edit User Access</h5>
                            <button type="button" class="btn-close" onclick="closeEditModal()"></button>
                        </div>
                        <div class="modal-body">
                            <input type="hidden" id="editUserId">
                            <div class="mb-3">
                                <label class="form-label fw-bold">Role</label>
                                <select id="editUserRole" class="form-select">
                                    <option value="pending">Pending</option>
                                    <option value="admin">Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-bold">Assigned Districts</label>
                                <div class="form-text mb-2">Select districts this user can access.</div>
                                <div id="districtCheckboxes" class="border rounded p-3 bg-light" style="max-height: 300px; overflow-y: auto;">
                                    <!-- Checkboxes injected here -->
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="window.saveUserChanges()">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    loadUsers();
};

async function loadUsers() {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';

    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-danger text-center">${error.message}</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(u => `
        <tr>
            <td>${u.email}</td>
            <td>
                <span class="badge bg-${u.role === 'super_admin' ? 'danger' : (u.role === 'admin' ? 'success' : 'warning text-dark')}">
                    ${u.role}
                </span>
            </td>
            <td>
                <small class="text-muted">${u.assigned_district || 'None'}</small>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditUser('${u.id}', '${u.role}', '${(u.assigned_district || '').replace(/'/g, "\\'")}')">
                    <i class="fa-solid fa-pen"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${u.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

window.openEditUser = (id, role, currentDistricts) => {
    document.getElementById('editUserId').value = id;
    document.getElementById('editUserRole').value = role;

    // Populate Checkboxes
    const container = document.getElementById('districtCheckboxes');
    const assigned = currentDistricts.split(',').map(d => d.trim());

    // Ensure districts are allowed unique values logic if needed, but here simply mapping state.districts
    // We assume state.districts is populated. If not, fallback or re-fetch?
    // It should be populated by main init. 

    // Sort districts alphabetically
    const districts = [...(state.districts || [])].sort();

    if (districts.length === 0) {
        container.innerHTML = '<div class="text-danger">No districts found. Please load data first.</div>';
    } else {
        container.innerHTML = `
            <div class="form-check mb-2 pb-2 border-bottom">
                <input class="form-check-input" type="checkbox" id="check_ALL" value="ALL" ${assigned.includes('ALL') ? 'checked' : ''}>
                <label class="form-check-label fw-bold text-primary" for="check_ALL">ALL DISTRICTS (Super Access)</label>
            </div>
        ` + districts.map(d => `
            <div class="form-check">
                <input class="form-check-input district-check" type="checkbox" value="${d}" id="check_${d.replace(/[^a-zA-Z0-9]/g, '')}" ${assigned.includes(d) ? 'checked' : ''}>
                <label class="form-check-label" for="check_${d.replace(/[^a-zA-Z0-9]/g, '')}">
                    ${d}
                </label>
            </div>
        `).join('');
    }

    // Show Edit Modal
    const editModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    editModal.show();
};

window.closeEditModal = () => {
    const el = document.getElementById('editUserModal');
    const modal = bootstrap.Modal.getInstance(el);
    if (modal) modal.hide();
};

window.saveUserChanges = async () => {
    const id = document.getElementById('editUserId').value;
    const role = document.getElementById('editUserRole').value;

    // Gather Districts
    const allCheck = document.getElementById('check_ALL');
    let districtVal = '';

    if (allCheck && allCheck.checked) {
        districtVal = 'ALL';
    } else {
        const checkboxes = document.querySelectorAll('.district-check:checked');
        const selected = Array.from(checkboxes).map(cb => cb.value);
        districtVal = selected.join(', ');
    }

    // Save
    try {
        const { error } = await supabase.from('profiles').update({
            role: role,
            assigned_district: districtVal
        }).eq('id', id);

        if (error) throw error;

        showToast('Success', 'User updated successfully', 'success');
        closeEditModal();
        loadUsers(); // Refresh list

    } catch (err) {
        console.error(err);
        showToast('Error', 'Update failed: ' + err.message, 'error');
    }
};

window.updateUser = async (id, field, value) => {
    try {
        const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', id);
        if (error) throw error;
        showToast('Success', 'User profile updated', 'success');
    } catch (err) {
        showToast('Error', err.message, 'error');
    }
};

window.deleteUser = async (id) => {
    if (!confirm('Delete this user profile? (Auth user must be deleted manually from Supabase console)')) return;
    // We can only delete the profile, not the auth user with the anon key usually
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) loadUsers();
};

// ==================== CSV UPLOAD ====================
window.uploadCSV = () => {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    const statusDiv = document.getElementById('csvStatus');
    const progressBar = document.getElementById('csvProgress');
    const bar = progressBar.querySelector('.progress-bar');

    if (!file) {
        statusDiv.innerHTML = '<span class="text-danger">Please select a file first.</span>';
        return;
    }

    // UI Reset
    statusDiv.innerHTML = 'Parsing file...';
    statusDiv.className = 'small text-info';
    progressBar.classList.remove('d-none');
    bar.style.width = '10%';

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async function (results) {
            const rows = results.data;
            if (rows.length === 0) {
                statusDiv.innerHTML = '<span class="text-danger">File is empty or invalid.</span>';
                return;
            }

            statusDiv.innerHTML = `Found ${rows.length} records. Starting upload...`;
            bar.style.width = '30%';

            // Batch parameters
            const BATCH_SIZE = 50;
            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE).map(row => ({
                    'Name of Student': row['Name of Student'] || row['name'] || '',
                    'VEC Exam Code': row['VEC Exam Code'] || row['exam_code'] || '',
                    'Mobile Number': row['Mobile Number'] || row['mobile'] || '',
                    'District': state.filters.district || row['District'] || row['district'] || '', // Enforce district if User is restricted
                    'School Name': row['School Name'] || row['school'] || '',
                    'Standard/Class': row['Standard/Class'] || row['class'] || '',
                    'Result Grades': row['Result Grades'] || row['grade'] || 'Pending'
                }));

                // Filter out empty rows (essential fields missing)
                const validBatch = batch.filter(r => r['Name of Student'] && r['VEC Exam Code']);

                if (validBatch.length > 0) {
                    const { error } = await supabase.from('students').upsert(validBatch, { onConflict: 'VEC Exam Code' });
                    if (error) {
                        console.error('Batch error:', error);
                        errorCount += validBatch.length;
                    } else {
                        successCount += validBatch.length;
                    }
                }

                // Update Progress
                const percent = Math.round(((i + BATCH_SIZE) / rows.length) * 100);
                bar.style.width = `${Math.min(percent, 100)}%`;
                statusDiv.innerHTML = `Uploaded ${successCount} records...`;
            }

            bar.style.width = '100%';
            bar.classList.remove('progress-bar-animated');
            statusDiv.innerHTML = `<span class="text-success fw-bold">Done! Success: ${successCount}, Failed: ${errorCount}</span>`;

            if (successCount > 0) {
                loadStudents(); // Refresh table
                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('csvModal'));
                    if (modal) modal.hide();
                    showToast('Upload Complete', `${successCount} records uploaded successfully.`);
                    // Reset UI
                    fileInput.value = '';
                    progressBar.classList.add('d-none');
                    statusDiv.innerHTML = '';
                }, 2000);
            }
        },
        error: function (err) {
            statusDiv.innerHTML = `<span class="text-danger">Parse Error: ${err.message}</span>`;
            progressBar.classList.add('d-none');
        }
    });
};

// Pagination Renderer
function renderPagination(total, container) {
    const totalPages = Math.ceil(total / state.pageSize);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Previous
    html += `
        <li class="page-item ${state.currentPage === 1 ? 'disabled' : ''}">
            <button class="page-link" onclick="loadStudents(${state.currentPage - 1})">Previous</button>
        </li>
    `;

    // Page Numbers (Simplified logic: show current, prev, next)
    const start = Math.max(1, state.currentPage - 1);
    const end = Math.min(totalPages, state.currentPage + 1);

    if (start > 1) html += `<li class="page-item"><button class="page-link" onclick="loadStudents(1)">1</button></li>`;
    if (start > 2) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;

    for (let i = start; i <= end; i++) {
        html += `
            <li class="page-item ${i === state.currentPage ? 'active' : ''}">
                <button class="page-link" onclick="loadStudents(${i})">${i}</button>
            </li>
        `;
    }

    if (end < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    if (end < totalPages) html += `<li class="page-item"><button class="page-link" onclick="loadStudents(${totalPages})">${totalPages}</button></li>`;

    // Next
    html += `
        <li class="page-item ${state.currentPage === totalPages ? 'disabled' : ''}">
            <button class="page-link" onclick="loadStudents(${state.currentPage + 1})">Next</button>
        </li>
    `;

    container.innerHTML = html;
}

// Start App
checkSession();
