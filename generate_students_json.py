import pandas as pd
import json
import os
import math

df = pd.read_csv('ml/data/learnalytix_500_students_with_result.csv')
df.columns = df.columns.str.strip()

def safe_float(val):
    try:
        v = float(val)
        return 0.0 if math.isnan(v) else round(v, 2)
    except:
        return 0.0

def safe_int(val):
    try:
        v = float(val)
        return 0 if math.isnan(v) else int(v)
    except:
        return 0

students = []
for _, r in df.iterrows():
    students.append({
        'roll_no':      str(r.get('Roll No', '')),
        'name':         str(r.get('Student Name', '')),
        'branch':       str(r.get('Branch', 'CE')),
        'year':         safe_int(r.get('Year', 1)),
        'cgpa':         safe_float(r.get('CGPA', 0)),
        'overall_att':  safe_float(r.get('Overall Att%', 0)),
        'backlogs':     safe_int(r.get('Backlogs', 0)),
        'internship':   str(r.get('Internship', 'No')) == 'Yes',
        'projects':     safe_int(r.get('Projects', 0)),
        'hackathons':   safe_int(r.get('Hackathons', 0)),
        's1_sgpa':      safe_float(r.get('S1 SGPA', 0)),
        's2_sgpa':      safe_float(r.get('S2 SGPA', 0)),
        's3_sgpa':      safe_float(r.get('S3 SGPA', 0)),
        's4_sgpa':      safe_float(r.get('S4 SGPA', 0)),
        'att_s1':       safe_float(r.get('Att S1%', 0)),
        'att_s2':       safe_float(r.get('Att S2%', 0)),
        'att_s3':       safe_float(r.get('Att S3%', 0)),
        'att_s4':       safe_float(r.get('Att S4%', 0)),
    })

os.makedirs('src/data', exist_ok=True)

with open('src/data/students.json', 'w') as f:
    json.dump(students, f)

print('Done!', len(students), 'students saved to src/data/students.json')