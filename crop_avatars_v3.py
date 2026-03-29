from PIL import Image, ImageChops, ImageFilter
import os

base_path = r"C:\Users\ADM\Desktop\Apostas Pro"
artifact_path = r"C:\Users\ADM\.gemini\antigravity\brain\8b9a37ae-1759-440f-856e-7b4adf3ff75c"
output_dir = os.path.join(base_path, "public", "assets", "avatars")

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def extract_icons(filename, cols, rows, count_to_extract, start_idx):
    img = Image.open(os.path.join(artifact_path, filename)).convert("RGB")
    w, h = img.size
    
    # Simple strategy: find the background color (usually at the extreme corner)
    bg_color = img.getpixel((0, 0))
    
    # Create a mask of "non-background" pixels
    mask = Image.new("L", (w, h), 0)
    for x in range(w):
        for y in range(h):
            p = img.getpixel((x, y))
            # Distance in RGB space
            dist = sum((p[i] - bg_color[i])**2 for i in range(3))**0.5
            if dist > 30: # Threshold for not being background
                mask.putpixel((x, y), 255)
    
    # Use the mask to find the "islands"
    # Actually, the grid is very regular. Let's find the bounding box of the whole grid first.
    diff = ImageChops.difference(img, Image.new("RGB", img.size, bg_color))
    grid_bbox = diff.getbbox()
    if not grid_bbox:
        return 0
        
    gx1, gy1, gx2, gy2 = grid_bbox
    gw = gx2 - gx1
    gh = gy2 - gy1
    
    # Calculate cell sizes based on the detected grid box
    step_x = gw / cols
    step_y = gh / rows
    
    extracted = 0
    for r in range(rows):
        for c in range(cols):
            if extracted >= count_to_extract:
                break
                
            cx1 = gx1 + c * step_x
            cy1 = gy1 + r * step_y
            cx2 = gx1 + (c + 1) * step_x
            cy2 = gy1 + (r + 1) * step_y
            
            # Crop the cell
            cell = img.crop((cx1, cy1, cx2, cy2))
            
            # Trim the cell to the actual icon content
            bg_cell = cell.getpixel((0,0))
            diff_cell = ImageChops.difference(cell, Image.new("RGB", cell.size, bg_cell))
            bbox_cell = diff_cell.getbbox()
            
            if bbox_cell:
                # Add a tiny padding to keep the rounded corners safe
                bx1, by1, bx2, by2 = bbox_cell
                padding = 2
                bx1 = max(0, bx1 - padding)
                by1 = max(0, by1 - padding)
                bx2 = min(cell.size[0], bx2 + padding)
                by2 = min(cell.size[1], by2 + padding)
                
                final_icon = cell.crop((bx1, by1, bx2, by2))
                
                # Resize to a consistent square size
                final_icon = final_icon.resize((200, 200), Image.Resampling.LANCZOS)
                final_icon.save(os.path.join(output_dir, f"suggested_{start_idx + extracted}.png"))
                extracted += 1
                
    return extracted

# Clear previous tries
for f in os.listdir(output_dir):
    os.remove(os.path.join(output_dir, f))

curr = 1
curr += extract_icons("media__1774729582812.jpg", 5, 3, 13, curr)
curr += extract_icons("media__1774729590862.jpg", 8, 4, 32, curr)
curr += extract_icons("media__1774729599483.jpg", 8, 4, 32, curr)

# Single ones - just resize them to 200x200 as well
for f in ["media__1774729608080.jpg", "media__1774729615771.jpg"]:
    img = Image.open(os.path.join(artifact_path, f)).convert("RGB")
    img = img.resize((200, 200), Image.Resampling.LANCZOS)
    img.save(os.path.join(output_dir, f"suggested_{curr}.png"))
    curr += 1

print(f"Sucesso! {curr-1} avatares extraídos e centrados.")
