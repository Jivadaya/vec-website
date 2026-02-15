from PIL import Image
from pptx import Presentation
import os

def check_ratio():
    img_path = r"d:\website\vec-website\images\certificate_bg.png"
    pptx_path = r"d:\website\vec-website\cert-generator\certificate_template.pptx"
    
    with Image.open(img_path) as img:
        img_w, img_h = img.size
        print(f"Image Dimensions: {img_w}x{img_h}px (Ratio: {img_w/img_h:.4f})")
        
    prs = Presentation(pptx_path)
    slide_w = prs.slide_width
    slide_h = prs.slide_height
    print(f"PPTX Slide Size (EMU): {slide_w}x{slide_h} (Ratio: {slide_w/slide_h:.4f})")
    
    # Calculate scale factor to map PPTX to Image
    scale_w = img_w / slide_w
    scale_h = img_h / slide_h
    print(f"Scale Factors: Width={scale_w}, Height={scale_h}")

if __name__ == "__main__":
    check_ratio()
