import os
from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 12)
        self.cell(0, 10, 'Edu Connect Source Code', 0, 1, 'C')

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def create_pdf(root_dir, output_file):
    pdf = PDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font('Courier', '', 9)

    exclude_dirs = ['node_modules', 'dist', 'build', '.git', '__pycache__', 'alembic', 'venv', 'env', '.pytest_cache']
    allowed_exts = ['.py', '.ts', '.tsx', '.md', '.html', '.yml', '.yaml']
    
    file_list = []
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
        for file in files:
            if any(file.endswith(ext) for ext in allowed_exts):
                file_list.append(os.path.join(root, file))
    
    # Sort files
    file_list.sort()
    
    for filepath in file_list:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Print file path as header
            pdf.set_font('Courier', 'B', 11)
            pdf.set_text_color(0, 51, 102)
            rel_path = os.path.relpath(filepath, root_dir)
            
            # encode to latin-1 to avoid fpdf errors, ignoring weird chars
            clean_path = rel_path.encode('latin-1', 'replace').decode('latin-1')
            pdf.cell(0, 10, f'--- {clean_path} ---', 0, 1)
            
            pdf.set_font('Courier', '', 8)
            pdf.set_text_color(0, 0, 0)
            
            import textwrap
            # add lines
            for line in content.split('\n'):
                # fpdf doesn't support unicode by default out of the box in this font, so replace chars
                clean_line = line.encode('latin-1', 'replace').decode('latin-1')
                # wrap line if it's too long (approx 80 chars for courier 8)
                wrapped = textwrap.wrap(clean_line, width=80) if clean_line.strip() else [""]
                for wline in wrapped:
                    pdf.multi_cell(0, 4, wline)
            
            pdf.ln(5)
        except Exception as e:
            print(f"Error processing {filepath}: {e}")

    pdf.output(output_file)
    print(f"PDF generated: {output_file}")

if __name__ == '__main__':
    create_pdf(r'd:\Aymen\edu', r'd:\Aymen\edu\Edu_Connect_App.pdf')
