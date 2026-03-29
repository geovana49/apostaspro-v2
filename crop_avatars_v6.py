from PIL import Image, ImageChops, ImageFilter
import os

base_path = r"C:\Users\ADM\Desktop\Apostas Pro"
artifact_path = r"C:\Users\ADM\.gemini\antigravity\brain\8b9a37ae-1759-440f-856e-7b4adf3ff75c"
output_dir = os.path.join(base_path, "public", "assets", "avatars")

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def extract_grid_smart(filename, cols, rows, count, start_idx):
    img = Image.open(os.path.join(artifact_path, filename)).convert("RGB")
    w, h = img.size
    bg_color = img.getpixel((0, 0))
    
    # Calculate initial grid
    cell_w = w / cols
    cell_h = h / rows
    
    extracted = 0
    for r in range(rows):
        for c in range(cols):
            if extracted >= count: break
            
            # 1. Define the cell area
            cx1, cy1 = int(c * cell_w), int(r * cell_h)
            cx2, cy2 = int((c + 1) * cell_w), int((r + 1) * cell_h)
            cell = img.crop((cx1, cy1, cx2, cy2))
            
            # 2. Find the actual content inside the cell
            # Mask the cell
            cw, ch = cell.size
            mask = Image.new("L", (cw, ch), 0)
            for x in range(cw):
                for y in range(ch):
                    p = cell.getpixel((x, y))
                    dist = sum((p[i] - bg_color[i])**2 for i in range(3))**0.5
                    if dist > 40: mask.putpixel((x, y), 255)
            
            # 3. Get the bounding box of the content
            bbox = mask.getbbox()
            if bbox:
                # Add a bit of padding to the bbox
                bx1, by1, bx2, by2 = bbox
                icon_crop = cell.crop((max(0, bx1-3), max(0, by1-3), min(cw, bx2+3), min(ch, by2+3)))
                
                # 4. Center in 200x200
                final = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
                icw, ich = icon_crop.size
                ratio = min(190/icw, 190/ich)
                new_size = (int(icw * ratio), int(ich * ratio))
                icon_resized = icon_crop.resize(new_size, Image.Resampling.LANCZOS)
                final.paste(icon_resized, ((200 - new_size[0]) // 2, (200 - new_size[1]) // 2))
                
                final.save(os.path.join(output_dir, f"suggested_{start_idx + extracted}.png"))
                extracted += 1
            else:
                print(f"Empty cell at r{r}c{c} in {filename}")
                
    return extracted

# Clear previous
for f in os.listdir(output_dir):
    if f.endswith(".png"): os.remove(os.path.join(output_dir, f))

curr = 1
curr += extract_grid_smart("media__1774729582812.jpg", 5, 3, 13, curr)
curr += extract_grid_smart("media__1774729590862.jpg", 8, 4, 32, curr)
curr += extract_grid_smart("media__1774729599483.jpg", 8, 4, 32, curr)

# Single ones
for f in ["media__1774729608080.jpg", "media__1774729615771.jpg"]:
    img = Image.open(os.path.join(artifact_path, f)).convert("RGBA")
    final = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    cw, ch = img.size
    ratio = min(190/cw, 190/ch)
    new_size = (int(cw * ratio), int(ch * ratio))
    img_resized = img.resize(new_size, Image.Resampling.LANCZOS)
    final.paste(img_resized, ((200 - new_size[0]) // 2, (200 - new_size[1]) // 2))
    final.save(os.path.join(output_dir, f"suggested_{curr}.png"))
    curr += 1

print(f"Sucesso! {curr-1} avatares extraídos e centralizados via V6.")
