from PIL import Image
import sys
import os

def remove_white_background(input_path, output_path, tolerance=30):
    """
    去除图片白色背景，转换为透明PNG
    tolerance: 容差值，越大越能容忍接近白色的颜色
    """
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # item 为 (R, G, B, A)
            # 判断是否接近白色
            if item[0] > 255 - tolerance and item[1] > 255 - tolerance and item[2] > 255 - tolerance:
                newData.append((255, 255, 255, 0))  # 完全透明
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Successfully processed: {output_path}")
        return True
    except Exception as e:
        print(f"Error processing image: {e}")
        return False

if __name__ == "__main__":
    # 硬编码路径以适应当前任务
    input_file = r"d:\Trae\OneGames\pictures\fengshu.jpg"
    output_file = r"d:\Trae\OneGames\pictures\fengshu.png"
    
    if os.path.exists(input_file):
        remove_white_background(input_file, output_file)
    else:
        print(f"Input file not found: {input_file}")
