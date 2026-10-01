import os
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def create_chart(filename, title, data_labels, data_values, chart_type='bar'):
    plt.figure(figsize=(6, 4))
    if chart_type == 'bar':
        plt.bar(data_labels, data_values, color=['#B87333', '#2C2A28', '#8B4513', '#D2B48C'])
        plt.title(title)
        plt.ylabel("Value (%)")
    elif chart_type == 'line':
        plt.plot(data_labels, data_values, marker='o', color='#B87333', linewidth=2)
        plt.title(title)
        plt.ylabel("Return (%)")
        plt.grid(True)
    elif chart_type == 'pie':
        plt.pie(data_values, labels=data_labels, autopct='%1.1f%%', colors=['#B87333', '#2C2A28', '#8B4513', '#D2B48C'])
        plt.title(title)
    
    plt.tight_layout()
    plt.savefig(filename)
    plt.close()

def generate_pdf(filename, title, paragraphs, table_data, chart1_info, chart2_info):
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    normal_style = styles['Normal']
    
    doc = SimpleDocTemplate(filename, pagesize=letter)
    story = []
    
    # Title
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 12))
    
    # Text content
    for p in paragraphs:
        story.append(Paragraph(p, normal_style))
        story.append(Spacer(1, 12))
        
    # Table
    if table_data:
        story.append(Paragraph("Fee Structure & Key Metrics", styles['Heading2']))
        t = Table(table_data, colWidths=[200, 150])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#2C2A28")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#FBF4EE")),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
        ]))
        story.append(t)
        story.append(Spacer(1, 24))
        
    # Charts
    if chart1_info:
        c1_file = f"temp_c1_{filename}.png"
        create_chart(c1_file, chart1_info['title'], chart1_info['labels'], chart1_info['values'], chart1_info['type'])
        story.append(Paragraph(chart1_info['title'], styles['Heading2']))
        story.append(Image(c1_file, width=400, height=260))
        story.append(Spacer(1, 24))
        
    if chart2_info:
        c2_file = f"temp_c2_{filename}.png"
        create_chart(c2_file, chart2_info['title'], chart2_info['labels'], chart2_info['values'], chart2_info['type'])
        story.append(Paragraph(chart2_info['title'], styles['Heading2']))
        story.append(Image(c2_file, width=400, height=260))
        story.append(Spacer(1, 24))
        
    from reportlab.platypus import PageBreak
    
    # Generate ~12 pages of detailed boilerplate text to make it realistic and long
    boilerplate = (
        "The Fund's investment objectives, risks, charges, and expenses must be considered carefully before investing. "
        "The statutory and summary prospectuses contain this and other important information about the investment company, "
        "and may be obtained by calling 800-555-0199 or visiting our website. Read it carefully before investing. "
        "Mutual fund investing involves risk. Principal loss is possible. "
        "The Fund is non-diversified, meaning it may concentrate its assets in fewer individual holdings than a diversified fund. "
        "Therefore, the Fund is more exposed to individual stock volatility than a diversified fund. "
        "The Fund invests in foreign securities which involve greater volatility and political, economic and currency risks and differences in accounting methods. "
        "These risks are greater for investments in emerging markets. The Fund may also invest in smaller companies, which involve additional risks such as limited liquidity and greater volatility."
    )
    
    for i in range(12):
        story.append(PageBreak())
        story.append(Paragraph(f"Section {i+3}: Detailed Regulatory Disclosures & Historical Context", styles['Heading1']))
        story.append(Spacer(1, 12))
        for j in range(6):  # 6 large paragraphs per page
            story.append(Paragraph(boilerplate, normal_style))
            story.append(Spacer(1, 12))
            story.append(Paragraph("Furthermore, the management committee evaluates quantitative risk metrics across standard deviation, beta, and alpha generation against benchmark indexes. The portfolio managers retain the right to shift allocations drastically during times of systemic market stress to preserve capital.", normal_style))
            story.append(Spacer(1, 12))
        
    doc.build(story)
    
    # Cleanup temp images
    if chart1_info and os.path.exists(f"temp_c1_{filename}.png"):
        os.remove(f"temp_c1_{filename}.png")
    if chart2_info and os.path.exists(f"temp_c2_{filename}.png"):
        os.remove(f"temp_c2_{filename}.png")

if __name__ == "__main__":
    # Document 1: Alpha Growth Fund
    generate_pdf(
        filename="Alpha_Growth_Fund_Q1.pdf",
        title="Alpha Growth Fund - Q1 2026 Prospectus",
        paragraphs=[
            "The Alpha Growth Fund seeks long-term capital appreciation by investing primarily in high-growth technology and renewable energy sectors.",
            "This document outlines the performance, risk factors, and fee structures for the first quarter of 2026. The fund is managed by seasoned veterans and utilizes quantitative models to identify breakout opportunities."
        ],
        table_data=[
            ["Metric", "Value"],
            ["Management Fee", "1.25%"],
            ["Expense Ratio", "1.40%"],
            ["Minimum Investment", "$10,000"],
            ["YTD Return", "+8.4%"],
            ["Risk Profile", "Aggressive"]
        ],
        chart1_info={
            "title": "Historical Returns (5 Years)",
            "labels": ["2022", "2023", "2024", "2025", "2026 YTD"],
            "values": [-12.5, 18.2, 24.1, 15.6, 8.4],
            "type": "line"
        },
        chart2_info={
            "title": "Asset Allocation",
            "labels": ["Software", "Hardware", "Renewable", "Cash"],
            "values": [45, 25, 20, 10],
            "type": "pie"
        }
    )
    
    # Document 2: Beta Income Fund
    generate_pdf(
        filename="Beta_Income_Fund_Q1.pdf",
        title="Beta Income Fund - Q1 2026 Prospectus",
        paragraphs=[
            "The Beta Income Fund focuses on capital preservation and generating steady yield through investments in high-quality corporate bonds, municipal debt, and dividend-paying blue-chip equities.",
            "Ideal for conservative investors or those nearing retirement, the fund aims to minimize volatility while providing a reliable quarterly income stream."
        ],
        table_data=[
            ["Metric", "Value"],
            ["Management Fee", "0.45%"],
            ["Expense Ratio", "0.60%"],
            ["Minimum Investment", "$2,500"],
            ["YTD Return", "+3.1%"],
            ["Risk Profile", "Conservative"]
        ],
        chart1_info={
            "title": "Historical Returns (5 Years)",
            "labels": ["2022", "2023", "2024", "2025", "2026 YTD"],
            "values": [-2.1, 4.5, 6.2, 5.1, 3.1],
            "type": "line"
        },
        chart2_info={
            "title": "Asset Allocation",
            "labels": ["Corporate Bonds", "Govt Debt", "Equities", "Cash"],
            "values": [50, 30, 15, 5],
            "type": "pie"
        }
    )
    
    print("Successfully generated Alpha_Growth_Fund_Q1.pdf and Beta_Income_Fund_Q1.pdf")
