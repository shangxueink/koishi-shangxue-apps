import json
import os
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options


def extract_all_json_characters(json_file):
    all_chars = set()
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            json_data = json.load(f)

        def traverse(obj):
            if isinstance(obj, str):
                # 去除回车符，并将字符串中的每个字符添加到集合中
                for char in obj.replace('\n', ''):
                    all_chars.add(char)
            elif isinstance(obj, dict):
                for value in obj.values():
                    traverse(value)
            elif isinstance(obj, list):
                for item in obj:
                    traverse(item)

        traverse(json_data)
        return all_chars
    except FileNotFoundError:
        print(f"错误：JSON 文件未找到：{json_file}")
        return None
    except json.JSONDecodeError:
        print(f"错误：JSON 文件解码失败：{json_file}")
        return None
    except Exception as e:
        print(f"提取字符时发生未知错误：{e}")
        return None


def write_characters_to_txt(chars, txt_file):
    """将字符集写入 TXT 文件。"""
    try:
        with open(txt_file, 'w', encoding='utf-8') as f:
            for char in sorted(list(chars)):  # 排序后写入
                f.write(char)
        print(f"字符集已写入到：{txt_file}")
        return True
    except Exception as e:
        print(f"写入字符集到 TXT 文件时发生错误：{e}")
        return False


def subset_font(font_file, chars, output_file):
    """
    裁剪字体文件，仅保留指定字符。

    Args:
        font_file: 原始字体文件路径。
        chars: 要保留的字符集合。
        output_file: 裁剪后的字体文件路径。
    """
    try:
        font = TTFont(font_file)

        options = Options()
        options.name_IDs = '*'  # 保留所有 name 表中的信息
        subsetter = Subsetter(options=options)

        # 确保 chars 是一个集合，并且包含所有需要保留的字符的 Unicode 码点
        unicodes_to_keep = [ord(c) for c in chars]
        subsetter.populate(unicodes=unicodes_to_keep)

        subsetter.subset(font)

        # 保存裁剪后的字体
        font.save(output_file)
        print(f"字体裁剪完成，已保存到: {output_file}")
        return True  # 裁剪成功
    except FileNotFoundError:
        print(f"错误：字体文件未找到：{font_file}")
        return False  # 裁剪失败
    except Exception as e:
        print(f"裁剪字体时发生错误：{e}")
        return False  # 裁剪失败


if __name__ == "__main__":
    json_file = r"./../lib/jrys.json"
    font_file = "千图马克手写体.ttf"
    output_file = "千图马克手写体lite.ttf"
    txt_file = "characters.txt"

    # 提取所有 JSON 字符
    required_chars = extract_all_json_characters(json_file)

    if required_chars:
        print(f"从 JSON 文件中提取到的字符数: {len(required_chars)}")

        # --- 在这里添加额外字符 ---
        extra_chars_str = "仅供娱乐相信科学请勿迷信"
        required_chars.update(set(extra_chars_str))
        print(f"添加额外字符后，总字符数: {len(required_chars)}")

        if write_characters_to_txt(required_chars, txt_file):
            # 裁剪字体
            if subset_font(font_file, required_chars, output_file):
                print("字体裁剪成功！")
            else:
                print("字体裁剪失败！")
        else:
            print("写入字符集到 TXT 文件失败。")
    else:
        print("未能提取到字符，无法进行字体裁剪。")
