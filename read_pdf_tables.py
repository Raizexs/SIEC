import pdfplumber

def extract_content(pdf_path, out_path):
    with pdfplumber.open(pdf_path) as pdf, open(out_path, 'w', encoding='utf-8') as f:
        f.write(f"Total pages: {len(pdf.pages)}\n")
        for i, page in enumerate(pdf.pages):
            f.write(f"--- Page {i+1} ---\n")
            text = page.extract_text()
            if text:
                f.write("TEXT:\n")
                f.write(text + "\n")
            
            tables = page.extract_tables()
            if tables:
                f.write("TABLES:\n")
                for j, table in enumerate(tables):
                    f.write(f"  Table {j+1}:\n")
                    for row in table:
                        f.write(f"    {row}\n")
            f.write("\n")

if __name__ == "__main__":
    extract_content("docs/Matrices de Rendimientos para Viviendas Sociales.pdf", "pdf_output.txt")
