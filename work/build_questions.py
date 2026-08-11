import json, re
from pathlib import Path

source = Path('work/pdf/source.txt').read_text()
answers = {}
for start, end, page in re.findall(r'ANSWER KEY (\d+)–(\d+)(.*?)(?=--- PAGE|\Z)', source, re.S):
    answers.update({int(n): letter for n, letter in re.findall(r'(\d+)\.\s*([A-D])', page)})

parts = re.split(r'--- PAGE \d+ ---\s*', source)
questions = []
for page in parts:
    match = re.search(r'Question\s+(\d+)\s*\n(.*?)(?=\nA\.\s)', page, re.S)
    if not match:
        continue
    number, prompt = int(match.group(1)), match.group(2)
    options = re.findall(r'^([A-D])\.\s*(.*?)(?=\n[A-D]\.\s|\Z)', page, re.M | re.S)
    if len(options) != 4 or number not in answers:
        raise ValueError(f'Could not parse question {number}: {options}')
    clean = lambda s: re.sub(r'\s+', ' ', s).strip().replace('0.0', '0')
    topic = ('Java Foundations' if number <= 18 else 'Control Flow' if number <= 45 else
             'Algorithms' if number <= 72 else 'Number Theory' if number <= 108 else 'Bits & Patterns')
    questions.append([topic, clean(prompt), [clean(x[1]) for x in options], 'ABCD'.index(answers[number])])
if len(questions) != 151:
    raise ValueError(f'Expected 151 questions, got {len(questions)}')
Path('outputs/cat1-practice/questions.js').write_text('window.BANK = ' + json.dumps(questions, ensure_ascii=False) + ';\n')
print(f'Built {len(questions)} questions')
