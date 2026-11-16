import os
import html

def create_html(root_dir, output_file):
    exclude_dirs = ['node_modules', 'dist', 'build', '.git', '__pycache__', 'alembic', 'venv', 'env', '.pytest_cache', 'assets']
    allowed_exts = ['.py', '.ts', '.tsx', '.md', '.html', '.yml', '.yaml']
    
    file_list = []
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
        for file in files:
            if any(file.endswith(ext) for ext in allowed_exts):
                file_list.append(os.path.join(root, file))
    
    file_list.sort()
    
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write('''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Edu Connect - Source Code</title>
<style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
    h1, h2 { color: #333; }
    .toc { margin-bottom: 30px; page-break-after: always; }
    .toc a { text-decoration: none; color: #0066cc; }
    .toc a:hover { text-decoration: underline; }
    .file-block { margin-bottom: 40px; page-break-inside: avoid; }
    .file-header { background: #f4f4f4; padding: 10px; border-left: 5px solid #0066cc; font-weight: bold; margin-bottom: 0; }
    pre { background: #fafafa; border: 1px solid #ddd; padding: 15px; overflow-x: auto; font-size: 12px; margin-top: 0; }
    code { font-family: Consolas, Monaco, "Courier New", monospace; }
</style>
</head>
<body>
<h1>Edu Connect - Source Code</h1>
<div class="toc">
    <h2>Table of Contents</h2>
    <ul>
''')
        for idx, filepath in enumerate(file_list):
            rel_path = os.path.relpath(filepath, root_dir)
            out.write(f'<li><a href="#file-{idx}">{html.escape(rel_path)}</a></li>\n')
            
        out.write('''    </ul>
</div>
''')

        for idx, filepath in enumerate(file_list):
            rel_path = os.path.relpath(filepath, root_dir)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
            except UnicodeDecodeError:
                try:
                    with open(filepath, 'r', encoding='latin-1') as f:
                        content = f.read()
                except Exception:
                    content = "Could not read file."
                    
            out.write(f'<div class="file-block" id="file-{idx}">\n')
            out.write(f'<div class="file-header">{html.escape(rel_path)}</div>\n')
            out.write(f'<pre><code>{html.escape(content)}</code></pre>\n')
            out.write('</div>\n')
            
        out.write('</body>\n</html>')

if __name__ == '__main__':
    create_html(r'd:\Aymen\edu', r'd:\Aymen\edu\Edu_Connect_App.html')
