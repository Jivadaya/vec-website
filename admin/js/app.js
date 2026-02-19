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

// Main Data Fetcher
async function loadStudents() {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5"><i class="fa-solid fa-circle-notch fa-spin text-primary fa-2x"></i></td></tr>`;

    try {
        let query = supabase
            .from('students')
            .select('*', { count: 'exact' });

        // Apply Search
        if (state.filters.search) {
            const term = `%${state.filters.search}%`;
            query = query.or(`"Name of Student".ilike.${term},"VEC Exam Code".ilike.${term},"Mobile Number".ilike.${term}`);
        }

        // Apply District Filter
        if (state.filters.district) {
            query = query.eq('District', state.filters.district); // Specific filter selected
        } else if (state.allowedDistricts && state.allowedDistricts.length > 0) {
            // No specific filter, but restricted to a list
            query = query.in('District', state.allowedDistricts);
        }

        // Pagination
        const from = (state.currentPage - 1) * state.pageSize;
        const to = from + state.pageSize
        const { data, error, count } = await query
            .order('Last Download At', { ascending: false, nullsFirst: false }) // Use an existing timestamp or fallback to Name
            .range(from, to);

        if (error) throw error;

        renderTable(data);
        updatePagination(count);

    } catch (err) {
        console.error('Error fetching students:', err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Error loading data. Please try again.</td></tr>`;
    }
}

function renderTable(students) {
    const tbody = document.getElementById('studentsTableBody');
    if (!students.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-secondary">No students found.</td></tr>`;
        return;
    }

    tbody.innerHTML = students.map(student => `
        <tr>
            <td class="fw-bold text-dark">${student['Name of Student'] || '-'}</td>
            <td><span class="badge bg-light text-dark border">${student['VEC Exam Code'] || '-'}</span></td>
            <td>${student['Mobile Number'] || '-'}</td>
            <td>${student['District'] || '-'}</td>
            <td>
                <span class="badge-custom ${getGradeBadgeClass(student['Result Grades'])}">
                    ${student['Result Grades'] || 'Pending'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-light border" onclick="window.editStudent('${student['VEC Exam Code']}')">
                    <i class="fa-solid fa-pen text-primary"></i>
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

// Pagination Actions
document.getElementById('prevPageBtn').addEventListener('click', () => {
    if (state.currentPage > 1) {
        state.currentPage--;
        loadStudents();
    }
});

document.getElementById('nextPageBtn').addEventListener('click', () => {
    state.currentPage++;
    loadStudents();
});

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
    // Create Modal on the fly
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
                            <table class="table table-bordered table-striped">
                                <thead><tr><th>Email</th><th>Role</th><th>District</th><th>Action</th></tr></thead>
                                <tbody id="userTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `);
        modalEl = document.getElementById('userModal');
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    loadUsers();
};

async function loadUsers() {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-danger">${error.message}</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(u => `
        <tr>
            <td>${u.email}</td>
            <td>
                <select class="form-select form-select-sm" onchange="updateUser('${u.id}', 'role', this.value)">
                    <option value="pending" ${u.role === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="super_admin" ${u.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
                </select>
            </td>
            <td>
                <input type="text" class="form-control form-control-sm" 
                       value="${u.assigned_district || ''}" 
                       placeholder="All / District Name"
                       list="districtSuggestions"
                       onchange="updateUser('${u.id}', 'assigned_district', this.value)">
            </td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${u.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

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

// Start App
checkSession();
