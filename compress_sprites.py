import os
import glob
from PIL import Image

TARGET_DIR = r"c:\Users\Administrator\OneDrive\桌面\workspace\Touhou-Isekai-Izakaya-main\src\assets\images\daily_sprites"
MAX_HEIGHT = 800

def compress_images():
    search_path = os.path.join(TARGET_DIR, "**", "*.png")
    image_files = glob.glob(search_path, recursive=True)
    
    print(f"找到 {len(image_files)} 张立绘图片，开始压缩...")
    
    total_original_size = 0
    total_new_size = 0
    count = 0

    for file_path in image_files:
        try:
            original_size = os.path.getsize(file_path)
            total_original_size += original_size
            
            with Image.open(file_path) as img:
                width, height = img.size
                
                # 如果高度超过最大值，则等比例缩小
                if height > MAX_HEIGHT:
                    new_height = MAX_HEIGHT
                    new_width = int((width / height) * new_height)
                    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # 覆盖保存并优化
                img.save(file_path, optimize=True)
                
            new_size = os.path.getsize(file_path)
            total_new_size += new_size
            count += 1
            if count % 10 == 0:
                print(f"已处理 {count}/{len(image_files)} 张图片...")
                
        except Exception as e:
            print(f"处理 {file_path} 失败: {e}")

    print(f"\n压缩完成！共处理 {count} 张图片。")
    print(f"压缩前总大小: {total_original_size / (1024*1024):.2f} MB")
    print(f"压缩后总大小: {total_new_size / (1024*1024):.2f} MB")
    
if __name__ == "__main__":
    compress_images()
