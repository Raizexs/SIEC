import os
import re

BAD_PATTERNS = [r"\x96", r"\xc2", r"├", r"Ã", r"Â", r"�", r"Ô", r"┬", r"�"]

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

issues = []
for dirpath, dirnames, filenames in os.walk(root):
    if '.git' in dirpath:
        continue
    for fn in filenames:
        if fn.endswith(('.py', '.md', '.sql', '.txt')):
            path = os.path.join(dirpath, fn)
            try:
                with open(path, 'rb') as fh:
                    data = fh.read()
                try:
                    text = data.decode('utf-8')
                except Exception:
                    text = data.decode('latin1', errors='replace')
                for p in BAD_PATTERNS:
                    if re.search(p, text):
                        issues.append((path, p))
                        break
            except Exception:
                pass

if issues:
    print('Found possible encoding issues in files:')
    for p in issues:
        print(p[0])
else:
    print('No obvious encoding issues found')
