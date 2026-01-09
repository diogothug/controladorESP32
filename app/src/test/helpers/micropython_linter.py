
import ast
import sys
import re

def check_indentation(code):
    lines = code.split('\n')
    for i, line in enumerate(lines):
        if '\t' in line:
            return f"Line {i+1}: contains tabs. Use spaces only."
        # Simplified check: strictly 4 spaces?
        # indent = len(line) - len(line.lstrip(' '))
        # if indent > 0 and indent % 4 != 0:
        #    return f"Line {i+1}: indentation {indent} is not a multiple of 4."
    return None

class MicroPythonLinter(ast.NodeVisitor):
    def __init__(self):
        self.errors = []
    
    def visit_ExceptHandler(self, node):
        if node.type is None:
            self.errors.append(f"Line {node.lineno}: Bare 'except:' found. Use 'except Exception:' to avoid catching KeyboardInterrupt.")
        self.generic_visit(node)

    # Example: Check for print() in specific risky contexts?
    # Not strictly forbidden, but good to know.

def main():
    if len(sys.argv) < 2:
        print("Usage: python micropython_linter.py <file.py>")
        sys.exit(1)

    file_path = sys.argv[1]
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            code = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)

    # 1. Indentation Check
    indent_err = check_indentation(code)
    if indent_err:
        print(f"Indentation Error: {indent_err}")
        sys.exit(1)

    # 2. AST Parse (Syntax Check)
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        print(f"Syntax Error: {e.msg} at line {e.lineno}, offset {e.offset}")
        print(f"  {e.text.strip() if e.text else ''}")
        sys.exit(1)

    # 3. AST Walking (Linting)
    linter = MicroPythonLinter()
    linter.visit(tree)

    if linter.errors:
        print("Lint Errors:")
        for err in linter.errors:
            print(f"  - {err}")
        sys.exit(1)

    print("OK: Syntax & Lint Passed")
    sys.exit(0)

if __name__ == "__main__":
    main()
