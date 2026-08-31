import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Lead } from '@/store/useStore';

export const generateProfessionalAuditPDF = (lead: Lead) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const accentColor: [number, number, number] = [27, 87, 177]; // #1b57b1
    const secondaryAccent: [number, number, number] = [108, 92, 231]; // Purple 

    // --- HELPER: Draw Progress Circle ---
    const drawScoreDial = (x: number, y: number, score: number, label: string) => {
        const radius = 12;
        doc.setLineWidth(1.5);
        
        // Background circle
        doc.setDrawColor(240, 240, 240);
        doc.circle(x, y, radius, 'S');
        
        // Progress arc (simplified as segments for jsPDF)
        let color = [239, 68, 68]; // Red
        if (score >= 50) color = [245, 158, 11]; // Orange
        if (score >= 80) color = [16, 185, 129]; // Green
        
        doc.setDrawColor(color[0], color[1], color[2]);
        const angle = (score / 100) * 360;
        // In jsPDF we can't easily draw arcs, so we'll use a thick line or just text for simplicity and stability
        doc.setFontSize(10);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(`${score}%`, x, y + 1, { align: 'center' });
        
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(label.toUpperCase(), x, y + radius + 5, { align: 'center' });
    };

    // --- HEADER SECTION ---
    doc.setFillColor( accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // Top-left branding
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('SyntexDev', margin, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('ADVANCED SALES INTELLIGENCE & AUDIT', margin, 32);
    
    // Top-right Date
    doc.text(`REPORT ID: ${lead.id.substring(0, 8).toUpperCase()}`, pageWidth - margin - 50, 20);
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin - 50, 25);

    // --- COMPANY HERO SECTION ---
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, 65, pageWidth - margin, 65);
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(lead.company || 'Technical Audit Report', margin, 75);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Website: ${lead.company_website || lead.source_url || 'N/A'}`, margin, 82);
    doc.text(`Industry: ${lead.industry || 'General Business'}`, margin, 87);

    // --- SCORE DASHBOARD ---
    const dashboardY = 100;
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.roundedRect(margin, dashboardY, pageWidth - (margin * 2), 40, 3, 3, 'F');
    
    // Draw 4 Main Scores
    const spacing = (pageWidth - (margin * 2)) / 5;
    drawScoreDial(margin + spacing, dashboardY + 18, lead.lighthouse_performance || 0, 'Performance');
    drawScoreDial(margin + spacing * 2, dashboardY + 18, lead.lighthouse_accessibility || 0, 'Accessibility');
    drawScoreDial(margin + spacing * 3, dashboardY + 18, lead.lighthouse_best_practices || 0, 'Best Practices');
    drawScoreDial(margin + spacing * 4, dashboardY + 18, lead.lighthouse_seo || 0, 'Search SEO');

    // --- TECHNICAL SPECS TABLE ---
    doc.setTextColor( accentColor[0], accentColor[1], accentColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Technical Infrastructure Health', margin, dashboardY + 55);

    const techData = [
        ['SSL Certificate Status', lead.ssl_enabled ? 'SECURE (VALID)' : 'VULNERABLE (MISSING)', lead.ssl_enabled ? 'Pass' : 'Critical'],
        ['Mobile Responsiveness', lead.mobile_friendly ? 'OPTIMIZED' : 'NOT OPTIMIZED', lead.mobile_friendly ? 'Pass' : 'Risk'],
        ['Page Load Velocity', lead.load_time_ms ? `${(lead.load_time_ms / 1000).toFixed(2)}s` : 'N/A', (lead.load_time_ms || 0) < 3000 ? 'Good' : 'Needs Optimization'],
        ['Broken Links Detected', lead.audit_data?.broken_links_count?.toString() || '0', (lead.audit_data?.broken_links_count || 0) === 0 ? 'Passed' : 'Warning'],
        ['Security Headers', lead.audit_data?.securityHeaders?.csp ? 'CONFIGURED' : 'UNPROTECTED', lead.audit_data?.securityHeaders?.csp ? 'Secure' : 'Exposure']
    ];

    autoTable(doc, {
        startY: dashboardY + 60,
        head: [['Infrastructure Check', 'Observation', 'Status']],
        body: techData,
        theme: 'striped',
        headStyles: { fillColor: accentColor, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: {
            2: { fontStyle: 'bold' }
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
                const val = data.cell.text[0];
                if (val === 'Critical' || val === 'Exposure' || val === 'Risk') data.cell.styles.textColor = [220, 38, 38];
                if (val === 'Pass' || val === 'Good' || val === 'Passed' || val === 'Secure') data.cell.styles.textColor = [5, 150, 105];
            }
        }
    });

    // --- STRATEGIC RECOMMENDATIONS ---
    let y = (doc as any).lastAutoTable.finalY + 15;
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Strategic Growth Recommendations', margin, y);
    
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    y += 8;
    
    const recs = [];
    if (!lead.ssl_enabled) {
        recs.push({ title: 'URGENT: Install SSL Certificate', desc: 'Your website is currently marked as "Not Secure" by browsers, which kills user trust and SEO rankings.' });
    }
    if ((lead.lighthouse_performance || 0) < 60) {
        recs.push({ title: 'Performance Optimization', desc: 'Slow load times are costing you leads. Consider image compression and code minification.' });
    }
    if (!lead.mobile_friendly) {
        recs.push({ title: 'Mobile-First Overhaul', desc: 'Over 60% of B2B traffic is mobile. Your site is currently difficult to navigate on smartphones.' });
    }
    if ((lead.lighthouse_seo || 0) < 80) {
        recs.push({ title: 'SEO Structural Fixes', desc: 'Correcting H1 hierarchies and Meta Descriptions will significantly improve your organic reach.' });
    }
    
    if (recs.length === 0) {
        recs.push({ title: 'Continuous Monitoring', desc: 'Your site is in excellent health. Continue periodic audits to maintain this competitive edge.' });
    }

    recs.forEach(rec => {
        if (y > pageHeight - 40) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(rec.title, margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const splitDesc = doc.splitTextToSize(rec.desc, pageWidth - (margin * 2));
        doc.text(splitDesc, margin, y);
        y += (splitDesc.length * 5) + 5;
    });

    // --- FOOTER ---
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageHeight - 30, pageWidth, 30, 'F');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('CONFIDENTIAL AUDIT REPORT | GENERATED BY SYNTEXDEV SALES INTELLIGENCE', pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text('This data is for informational purposes and intended to assist in business growth strategies.', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Output
    const fileName = (lead.company || lead.first_name || 'Leads').replace(/\s+/g, '_');
    doc.save(`SyntexDev_Audit_${fileName}.pdf`);
};
