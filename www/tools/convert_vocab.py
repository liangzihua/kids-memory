#!/usr/bin/env python3
"""
convert_vocab.py — 将 ECDICT 词典转换为 kids-memory APP 格式

使用方法：
1. 下载 ECDICT: https://github.com/skywind3000/ECDICT
   解压后得到 ecdict.csv
2. 安装依赖: pip install pandas
3. 运行: python convert_vocab.py --input ecdict.csv --grade middle --count 2000

参数：
  --input   ECDICT CSV 文件路径
  --grade   primary3/primary4/primary5/primary6/middle1/middle2/middle3/cet4/cet6/daily
  --count   输出词汇数量（按词频排序取前N个）
  --output  输出目录（默认 data/builtin/english/）
"""

import csv
import json
import argparse
import os
import re
from pathlib import Path

# 各年级词汇难度（按 ECDICT frq 字段，越小越常用）
GRADE_CONFIG = {
    'primary3': {'frq_max': 3000, 'length_max': 6,  'tag': '小学三年级'},
    'primary4': {'frq_max': 4000, 'length_max': 7,  'tag': '小学四年级'},
    'primary5': {'frq_max': 5000, 'length_max': 8,  'tag': '小学五年级'},
    'primary6': {'frq_max': 6000, 'length_max': 9,  'tag': '小学六年级'},
    'middle1':  {'frq_max': 8000, 'length_max': 10, 'tag': '初中一年级'},
    'middle2':  {'frq_max': 10000,'length_max': 11, 'tag': '初中二年级'},
    'middle3':  {'frq_max': 12000,'length_max': 12, 'tag': '初中三年级'},
    'cet4':     {'frq_max': 15000,'length_max': 14, 'tag': 'CET-4'},
    'cet6':     {'frq_max': 20000,'length_max': 16, 'tag': 'CET-6'},
    'daily':    {'frq_max': 5000, 'length_max': 10, 'tag': '日常英语'},
}

def clean_definition(definition):
    """清理词典定义，保留前两个含义"""
    if not definition:
        return ''
    # 去掉括号内的英文说明
    cleaned = re.sub(r'\([^)]+\)', '', definition)
    # 分号分割，取前两个
    parts = [p.strip() for p in cleaned.split(';') if p.strip()]
    return '；'.join(parts[:3])

def convert_ecdict(input_file, grade, count, output_dir):
    config = GRADE_CONFIG.get(grade, GRADE_CONFIG['middle1'])

    print(f"读取 ECDICT: {input_file}")
    words = []

    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            word = row.get('word', '').strip()
            trans = row.get('translation', '').strip()
            phonetic = row.get('phonetic', '').strip()
            frq = int(row.get('frq', '0') or '0')

            # 过滤条件
            if not word or not trans:
                continue
            if len(word) > config['length_max']:
                continue
            if frq <= 0 or frq > config['frq_max']:
                continue
            if not word.isalpha():  # 只要纯字母单词
                continue
            if word[0].isupper():  # 过滤专有名词
                continue

            words.append({
                'word': word,
                'trans': trans,
                'phonetic': f'/{phonetic}/' if phonetic and not phonetic.startswith('/') else phonetic,
                'frq': frq
            })

    # 按词频排序（frq 越小越常用）
    words.sort(key=lambda x: x['frq'])
    words = words[:count]

    print(f"筛选出 {len(words)} 个词汇")

    # 转换为 APP 格式
    cards = []
    for i, w in enumerate(words):
        back = clean_definition(w['trans'])
        if not back:
            continue

        card = {
            'id': f'ecdict_{grade}_{i+1:04d}',
            'type': 'word',
            'front': w['word'],
            'back': back,
            'phonetic': w['phonetic'],
            'hint': '',
            'example': '',
            'tags': ['英语', config['tag'], '词汇']
        }
        cards.append(card)

    # 输出 JSON
    output = {
        'meta': {
            'subject': 'english',
            'grade': 'primary' if grade.startswith('primary') else 'middle' if grade.startswith('middle') else 'adult',
            'name': f'英语词汇（{config["tag"]}，{len(cards)}词）',
            'version': '2024',
            'count': len(cards),
            'source': 'ECDICT'
        },
        'cards': cards
    }

    out_path = Path(output_dir)
    if grade.startswith('primary'):
        out_path = out_path / 'primary'
    elif grade.startswith('middle'):
        out_path = out_path / 'middle'
    else:
        out_path = out_path

    out_path.mkdir(parents=True, exist_ok=True)
    filename = out_path / f'{grade}_words_full.json'

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"已输出 {len(cards)} 条到: {filename}")
    return filename

def main():
    parser = argparse.ArgumentParser(description='将 ECDICT 转换为 kids-memory 格式')
    parser.add_argument('--input', required=True, help='ECDICT CSV 文件路径')
    parser.add_argument('--grade', default='middle1', choices=list(GRADE_CONFIG.keys()),
                        help='目标年级')
    parser.add_argument('--count', type=int, default=500, help='词汇数量')
    parser.add_argument('--output', default='data/builtin/english', help='输出目录')
    parser.add_argument('--all-grades', action='store_true', help='生成所有年级')

    args = parser.parse_args()

    if args.all_grades:
        for grade in GRADE_CONFIG:
            convert_ecdict(args.input, grade, args.count, args.output)
    else:
        convert_ecdict(args.input, args.grade, args.count, args.output)

if __name__ == '__main__':
    main()
