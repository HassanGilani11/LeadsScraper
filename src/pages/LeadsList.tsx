import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppContainer from '@/components/layout/AppContainer';
import { Users, Mail, Download, Upload, FileText, Search, ChevronDown, CheckCircle2, Circle, Loader2, Trash2, Edit2, X, ArrowLeft, Copy, MoreVertical, Send, Database, Globe, Eye, HeartPulse, Activity, ShieldCheck, Type, FileSearch, Accessibility, XCircle, Clock, Zap, Award, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore, Lead } from '@/store/useStore';
import { toast } from 'sonner';
import BulkEmailModal from '@/components/modals/BulkEmailModal';
import AssignToCampaignModal from '@/components/modals/AssignToCampaignModal';
import { Target } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import CustomSelect from '@/components/ui/CustomSelect';

const LeadsList = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const campaignId = searchParams.get('campaignId');
    const industryFilter = searchParams.get('industry');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const { user, leads, setLeads, addLead, addNotification } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [campaignName, setCampaignName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState('newest');
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [showBulkEmail, setShowBulkEmail] = useState(false);
    const [singleEmailLead, setSingleEmailLead] = useState<Lead | null>(null);
    const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);
    const [viewingLead, setViewingLead] = useState<Lead | null>(null);
    const [emailStatusMap, setEmailStatusMap] = useState<Record<string, { status: 'sent' | 'failed'; error?: string }>>({});
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [leadsToAssign, setLeadsToAssign] = useState<Lead[]>([]);
    const [isAuditingBulk, setIsAuditingBulk] = useState(false);
    const [bulkAuditProgress, setBulkAuditProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [companyFilter, setCompanyFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [editSource, setEditSource] = useState('scraper');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) {
            fetchLeads();
            fetchEmailLogs();
            if (campaignId) fetchCampaignName();
        }
    }, [user, campaignId, industryFilter, minScore, maxScore]);

    // Handle URL search parameter
    useEffect(() => {
        const queryParam = searchParams.get('q');
        if (queryParam) {
            setSearchTerm(queryParam);
        }
    }, [searchParams]);

    // Click away listener for dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            const isToggleButton = (target as HTMLElement).closest('.dropdown-toggle');
            
            if (dropdownOpenId && dropdownRef.current && !dropdownRef.current.contains(target) && !isToggleButton) {
                setDropdownOpenId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [dropdownOpenId]);

    const fetchCampaignName = async () => {
        const { data } = await supabase
            .from('campaigns')
            .select('name')
            .eq('id', campaignId)
            .single();
        if (data) setCampaignName(data.name);
    };

    const fetchLeads = async () => {
        if (!user) return;
        setLoading(true);
        try {
            let query = supabase
                .from('leads')
                .select('*')
                .eq('user_id', user.id);

            if (campaignId) {
                query = query.eq('campaign_id', campaignId);
            }

            if (industryFilter) {
                query = query.eq('industry', industryFilter);
            }

            if (minScore) {
                query = query.gte('icp_score', parseInt(minScore));
            }

            if (maxScore) {
                query = query.lte('icp_score', parseInt(maxScore));
            }

            const { data, error } = await query
                .select(`
                    *,
                    lead_audits (
                        score,
                        lighthouse_performance,
                        lighthouse_accessibility,
                        lighthouse_best_practices,
                        lighthouse_seo,
                        ssl_enabled,
                        mobile_friendly,
                        audit_data,
                        created_at
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Format dates and attach latest audit score
            const formattedLeads = data?.map(lead => {
                const audits = (lead.lead_audits as any[]) || [];
                const latestAudit = audits.sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0];

                return {
                    ...lead,
                    created_at: new Date(lead.created_at).toISOString().split('T')[0],
                    audit_score: latestAudit?.score !== undefined ? latestAudit.score : null,
                    lighthouse_performance: latestAudit?.lighthouse_performance !== undefined ? latestAudit.lighthouse_performance : null,
                    lighthouse_accessibility: latestAudit?.lighthouse_accessibility !== undefined ? latestAudit.lighthouse_accessibility : null,
                    lighthouse_best_practices: latestAudit?.lighthouse_best_practices !== undefined ? latestAudit.lighthouse_best_practices : null,
                    lighthouse_seo: latestAudit?.lighthouse_seo !== undefined ? latestAudit.lighthouse_seo : null,
                    load_time_ms: latestAudit?.load_time_ms !== undefined ? latestAudit.load_time_ms : null,
                    ssl_enabled: latestAudit?.ssl_enabled !== undefined ? latestAudit.ssl_enabled : null,
                    mobile_friendly: latestAudit?.mobile_friendly !== undefined ? latestAudit.mobile_friendly : null,
                    audit_data: latestAudit?.audit_data || null
                };
            }) || [];
            
            setLeads(formattedLeads);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmailLogs = async () => {
        if (!user) return;
        try {
            const { data } = await supabase
                .from('email_logs')
                .select('lead_id, status, error_message')
                .eq('user_id', user.id)
                .not('lead_id', 'is', null)
                .order('sent_at', { ascending: false });

            if (data) {
                // Keep only the LATEST status per lead
                const map: Record<string, { status: 'sent' | 'failed'; error?: string }> = {};
                data.forEach(row => {
                    if (row.lead_id && !map[row.lead_id]) {
                        map[row.lead_id] = { status: row.status, error: row.error_message || undefined };
                    }
                });
                setEmailStatusMap(map);
            }
        } catch (err) {
            console.error('Error fetching email logs:', err);
        }
    };

    const handleExportCSV = () => {
        const itemsToExport = selectedRows.length > 0 
            ? leads.filter(lead => selectedRows.includes(lead.id))
            : leads;

        if (itemsToExport.length === 0) return;
        
        const headers = [
            'First Name', 'Last Name', 'Email', 'Company', 'Status', 'Industry', 'ICP Score', 
            'Audit Score', 'Performance', 'SEO', 'Accessibility', 'Best Practices', 'SSL Enabled', 'Mobile Friendly',
            'Source', 'Date Created',
            'Phone', 'Website', 'LinkedIn', 'Facebook', 'Twitter', 'Instagram', 'YouTube', 'Pinterest', 'Snapchat', 
            'WhatsApp', 'TikTok', 'Telegram', 'Skype', 'Contact Page', 'About Page',
            'Logo URL', 'Description', 'Founded Year', 'Technographics', 'Meta Title', 'Meta Description', 'Keywords', 'Language', 'Career Page', 'Open Positions'
        ];
        const rows = itemsToExport.map(lead => [
            lead.first_name || '',
            lead.last_name || '',
            lead.email,
            lead.company || '',
            lead.status || 'new',
            lead.industry || '',
            lead.icp_score || '0',
            lead.audit_score ?? 'N/A',
            lead.lighthouse_performance ?? 'N/A',
            lead.lighthouse_seo ?? 'N/A',
            lead.lighthouse_accessibility ?? 'N/A',
            lead.lighthouse_best_practices ?? 'N/A',
            lead.ssl_enabled ? 'Yes' : 'No',
            lead.mobile_friendly ? 'Yes' : 'No',
            lead.source || 'scraper',
            lead.created_at || '',
            lead.phone || '',
            lead.company_website || '',
            lead.linkedin_url || '',
            lead.facebook_url || '',
            lead.twitter_url || '',
            lead.instagram_url || '',
            lead.youtube_url || '',
            lead.pinterest_url || '',
            lead.snapchat || '',
            lead.whatsapp || '',
            lead.tiktok || '',
            lead.telegram || '',
            lead.skype || '',
            lead.contact_page_url || '',
            lead.about_page_url || '',
            lead.logo_url || '',
            lead.business_description || '',
            lead.founded_year || '',
            (lead.technographics || []).join('; '),
            lead.meta_title || '',
            lead.meta_description || '',
            (lead.primary_keywords || []).join('; '),
            lead.website_language || '',
            lead.career_page_url || '',
            lead.open_positions_count || 0
        ]);
        
        // Add BOM for Excel compatibility
        const BOM = '\uFEFF';
        const csvContent = BOM + [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportCSV = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            let text = e.target?.result as string;
            if (!text) return;

            // Remove UTF-8 BOM if present
            if (text.startsWith('\uFEFF')) {
                text = text.substring(1);
            }

            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                toast.error('The CSV file is empty or has no data rows.');
                return;
            }

            const parseCSVLine = (line: string) => {
                const result = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        if (inQuotes && line[i + 1] === '"') {
                            current += '"';
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            };

            const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
            const emailIndex = headers.findIndex(h => h.includes('email'));

            if (emailIndex === -1) {
                toast.error('The CSV file must contain an "Email" column. Found: ' + headers.join(', '));
                return;
            }

            const firstNameIndex = headers.findIndex(h => h.includes('first name'));
            const lastNameIndex = headers.findIndex(h => h.includes('last name'));
            const companyIndex = headers.findIndex(h => h.includes('company'));
            const statusIndex = headers.findIndex(h => h.includes('status'));
            const industryIndex = headers.findIndex(h => h.includes('industry'));
            const icpScoreIndex = headers.findIndex(h => h.includes('icp score'));
            const phoneIndex = headers.findIndex(h => h.includes('phone'));
            const websiteIndex = headers.findIndex(h => h.includes('website'));
            const linkedinIndex = headers.findIndex(h => h.includes('linkedin'));
            const facebookIndex = headers.findIndex(h => h.includes('facebook'));
            const twitterIndex = headers.findIndex(h => h.includes('twitter'));
            const instagramIndex = headers.findIndex(h => h.includes('instagram'));
            const youtubeIndex = headers.findIndex(h => h.includes('youtube'));
            const pinterestIndex = headers.findIndex(h => h.includes('pinterest'));
            const snapchatIndex = headers.findIndex(h => h.includes('snapchat'));
            const whatsappIndex = headers.findIndex(h => h.includes('whatsapp'));
            const tiktokIndex = headers.findIndex(h => h.includes('tiktok'));
            const telegramIndex = headers.findIndex(h => h.includes('telegram'));
            const skypeIndex = headers.findIndex(h => h.includes('skype'));
            const contactPageIndex = headers.findIndex(h => h.includes('contact page'));
            const aboutPageIndex = headers.findIndex(h => h.includes('about page'));
            const logoIndex = headers.findIndex(h => h.includes('logo'));
            const descIndex = headers.findIndex(h => h.includes('description'));
            const foundedIndex = headers.findIndex(h => h.includes('founded'));
            const techIndex = headers.findIndex(h => h.includes('technographics'));
            const metaTitleIndex = headers.findIndex(h => h.includes('meta title'));
            const metaDescIndex = headers.findIndex(h => h.includes('meta description'));
            const keywordsIndex = headers.findIndex(h => h.includes('keywords'));
            const langIndex = headers.findIndex(h => h.includes('language'));
            const careerIndex = headers.findIndex(h => h.includes('career page'));
            const jobsIndex = headers.findIndex(h => h.includes('open positions'));

            const newLeads = [];
            for (let i = 1; i < lines.length; i++) {
                try {
                    const values = parseCSVLine(lines[i]);
                    if (values.length === 0) continue;

                    const email = values[emailIndex];
                    if (!email || !email.includes('@')) continue;

                    newLeads.push({
                        user_id: user.id,
                        email,
                        first_name: firstNameIndex !== -1 ? (values[firstNameIndex] || null) : null,
                        last_name: lastNameIndex !== -1 ? (values[lastNameIndex] || null) : null,
                        company: companyIndex !== -1 ? (values[companyIndex] || null) : null,
                        status: statusIndex !== -1 ? (values[statusIndex]?.toLowerCase() || 'new') : 'new',
                        industry: industryIndex !== -1 ? (values[industryIndex] || null) : null,
                        icp_score: icpScoreIndex !== -1 ? parseInt(values[icpScoreIndex]) || 0 : 0,
                        phone: phoneIndex !== -1 ? (values[phoneIndex] || null) : null,
                        company_website: websiteIndex !== -1 ? (values[websiteIndex] || null) : null,
                        linkedin_url: linkedinIndex !== -1 ? (values[linkedinIndex] || null) : null,
                        facebook_url: facebookIndex !== -1 ? (values[facebookIndex] || null) : null,
                        twitter_url: twitterIndex !== -1 ? (values[twitterIndex] || null) : null,
                        instagram_url: instagramIndex !== -1 ? (values[instagramIndex] || null) : null,
                        youtube_url: youtubeIndex !== -1 ? (values[youtubeIndex] || null) : null,
                        pinterest_url: pinterestIndex !== -1 ? (values[pinterestIndex] || null) : null,
                        snapchat: snapchatIndex !== -1 ? (values[snapchatIndex] || null) : null,
                        whatsapp: whatsappIndex !== -1 ? (values[whatsappIndex] || null) : null,
                        tiktok: tiktokIndex !== -1 ? (values[tiktokIndex] || null) : null,
                        telegram: telegramIndex !== -1 ? (values[telegramIndex] || null) : null,
                        skype: skypeIndex !== -1 ? (values[skypeIndex] || null) : null,
                        contact_page_url: contactPageIndex !== -1 ? (values[contactPageIndex] || null) : null,
                        about_page_url: aboutPageIndex !== -1 ? (values[aboutPageIndex] || null) : null,
                        logo_url: logoIndex !== -1 ? (values[logoIndex] || null) : null,
                        business_description: descIndex !== -1 ? (values[descIndex] || null) : null,
                        founded_year: foundedIndex !== -1 ? (values[foundedIndex] || null) : null,
                        technographics: techIndex !== -1 ? (values[techIndex] ? values[techIndex].split(';').map(s => s.trim()) : []) : [],
                        meta_title: metaTitleIndex !== -1 ? (values[metaTitleIndex] || null) : null,
                        meta_description: metaDescIndex !== -1 ? (values[metaDescIndex] || null) : null,
                        primary_keywords: keywordsIndex !== -1 ? (values[keywordsIndex] ? values[keywordsIndex].split(';').map(s => s.trim()) : []) : [],
                        website_language: langIndex !== -1 ? (values[langIndex] || null) : null,
                        career_page_url: careerIndex !== -1 ? (values[careerIndex] || null) : null,
                        open_positions_count: jobsIndex !== -1 ? parseInt(values[jobsIndex]) || 0 : 0,
                        campaign_id: campaignId || null,
                        source: 'csv'
                    });
                } catch (parseErr) {
                    console.error('Row parsing error at line ' + (i + 1), parseErr);
                }
            }

            if (newLeads.length === 0) {
                toast.error('No valid leads found in the CSV file. Please ensure emails are valid.');
                return;
            }

            const loadingToast = toast.loading(`Importing ${newLeads.length} leads...`);
            try {
                const { error } = await supabase
                    .from('leads')
                    .insert(newLeads);

                if (error) {
                    toast.dismiss(loadingToast);
                    toast.error(`Import failed: ${error.message}`);
                    console.error('Supabase Import Error:', error);
                    return;
                }

                toast.dismiss(loadingToast);
                toast.success(`Successfully imported ${newLeads.length} leads.`);
                fetchLeads();
            } catch (err: any) {
                console.error('Error importing leads:', err);
                toast.dismiss(loadingToast);
                toast.error(`Import failed: ${err.message || 'Check file format'}`);
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleEditClick = (lead: Lead) => {
        setEditingLead(lead);
        setEditSource(lead.source || 'scraper');
    };

    const handleGeneratePDF = (lead: Lead) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Header
        doc.setFillColor(27, 87, 177); // #1b57b1
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Website Health Audit', 15, 25);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth - 55, 25);

        // Lead Info
        doc.setTextColor(33, 33, 33);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${lead.company || lead.first_name + ' ' + lead.last_name} - Assessment`, 15, 55);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Contact: ${lead.first_name} ${lead.last_name}`, 15, 65);
        doc.text(`Email: ${lead.email}`, 15, 70);
        doc.text(`Website: ${lead.company_website || lead.source_url || 'N/A'}`, 15, 75);

        // Metric mapping
        const scoresData = [
            ['Overall Health Score', `${lead.audit_score || 0}/100`],
            ['Core Performance', `${lead.lighthouse_performance || 0}%`],
            ['Search Optimization (SEO)', `${lead.lighthouse_seo || 0}%`],
            ['Accessibility Compliance', `${lead.lighthouse_accessibility || 0}%`],
            ['Web Best Practices', `${lead.lighthouse_best_practices || 0}%`],
            ['Security (SSL/HTTPS)', lead.ssl_enabled ? 'Active' : 'Missing'],
            ['Mobile Optimization', lead.mobile_friendly ? 'Optimized' : 'Not Responsive']
        ];

        autoTable(doc, {
            startY: 85,
            head: [['Audit Metric', 'Optimization Level']],
            body: scoresData,
            theme: 'grid',
            headStyles: { fillColor: [27, 87, 177], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 4 }
        });

        // Recommendations
        let y = (doc as any).lastAutoTable?.finalY || 150;
        y += 15;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Strategic Recommendations', 15, y);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        y += 10;
        
        const recommendations = [];
        if ((lead.lighthouse_performance || 0) < 80) recommendations.push("• Optimize core web vitals and image compression for faster load times.");
        if (!lead.ssl_enabled) recommendations.push("• CRITICAL: Secure your domain with an SSL certificate to protect user data.");
        if (!lead.mobile_friendly) recommendations.push("• Implement responsive design to capture mobile traffic effectively.");
        if ((lead.lighthouse_seo || 0) < 80) recommendations.push("• Enhance on-page SEO structure (H1 tags, Meta Descriptions) for better rankings.");
        if (recommendations.length === 0) recommendations.push("• Site is currently high-performing. Continue regular monitoring for regressions.");

        recommendations.forEach(rec => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(rec, 15, y);
            y += 8;
        });

        // Footer
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('This report was generated by SyntexDev. Data is based on real-time website analysis.', 15, pageHeight - 10);

        const fileName = (lead.company || lead.first_name || 'Lead').replace(/\s+/g, '_');
        doc.save(`Audit_Report_${fileName}.pdf`);
        toast.success('Professional PDF Report ready!');
    };
            
    const handleDownloadSampleCSV = () => {
        const headers = [
            'First Name', 'Last Name', 'Email', 'Company', 'Status', 'Industry', 'ICP Score', 
            'Phone', 'Website', 'LinkedIn', 'Facebook', 'Twitter', 'Instagram', 'YouTube', 'Pinterest', 'Snapchat', 
            'WhatsApp', 'TikTok', 'Telegram', 'Skype', 'Contact Page', 'About Page',
            'Logo URL', 'Description', 'Founded Year', 'Technographics', 'Meta Title', 'Meta Description', 'Keywords', 'Language', 'Career Page', 'Open Positions'
        ];
        
        const sampleData = [
            'John', 'Doe', 'john.doe@example.com', 'Example Corp', 'New', 'Technology', '85',
            '+1234567890', 'https://example.com', 'https://linkedin.com/in/johndoe', 'https://facebook.com/example', 'https://twitter.com/example', 'https://instagram.com/example', 'https://youtube.com/example', 'https://pinterest.com/example', 'https://snapchat.com/add/example',
            '+1234567890', 'https://tiktok.com/@example', 'https://t.me/example', 'johndoe_skype', 'https://example.com/contact', 'https://example.com/about',
            'https://example.com/logo.png', 'A leading example corporation.', '2010', 'React; Node.js; AWS', 'Example Corp | Home', 'Leading example corp meta description', 'example; business; leads', 'English', 'https://example.com/careers', '5'
        ];
        
        const csvContent = '\uFEFF' + [
            headers.join(','),
            sampleData.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'leads_sample_format.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDuplicateLead = async (lead: Lead) => {
        if (!user) return;

        const { id, created_at, ...leadData } = lead;
        const newLead = {
            ...leadData,
            user_id: user.id
        };

        try {
            const { data, error } = await supabase
                .from('leads')
                .insert([newLead])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                addLead({
                    ...data,
                    created_at: new Date(data.created_at).toISOString().split('T')[0]
                });
                toast.success('Lead duplicated successfully');
            }
        } catch (err) {
            console.error('Error duplicating lead:', err);
            toast.error('Failed to duplicate lead');
        }
    };

    const handleDeleteLead = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this lead?')) return;
        
        try {
            const { error } = await supabase
                .from('leads')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            setLeads(leads.filter(lead => lead.id !== id));
            setSelectedRows(selectedRows.filter(rowId => rowId !== id));
            toast.success('Lead deleted');
        } catch (error) {
            console.error('Error deleting lead:', error);
            toast.error('Failed to delete lead');
        }
    };

    const handleAuditLead = async (lead: Lead) => {
        if (!user || !lead.company_website && !lead.source_url) {
            toast.error('Website URL is required to run an audit');
            return;
        }

        const url = lead.company_website || lead.source_url;
        const toastId = toast.loading(`Auditing ${url}...`);
        
        try {
            const { data, error } = await supabase.functions.invoke('audit-lead', {
                body: { leadId: lead.id, url, userId: user.id }
            });

            if (error) throw error;

            if (data.success) {
                toast.success('Audit completed successfully!', { id: toastId });
                // Update local state
                setLeads(leads.map(l => 
                    l.id === lead.id ? { 
                        ...l, 
                        audit_score: data.data.score,
                        lighthouse_performance: data.data.lighthouse_performance,
                        lighthouse_accessibility: data.data.lighthouse_accessibility,
                        lighthouse_best_practices: data.data.lighthouse_best_practices,
                        lighthouse_seo: data.data.lighthouse_seo,
                        load_time_ms: data.data.load_time_ms,
                        ssl_enabled: data.data.ssl_enabled,
                        mobile_friendly: data.data.mobile_friendly,
                        audit_data: data.data.audit_data
                    } : l
                ));
            } else {
                throw new Error(data.error || 'Audit failed');
            }
        } catch (err: any) {
            console.error('Audit Error:', err);
            toast.error(`Audit failed: ${err.message}`, { id: toastId });
        }
    };
    const handleBulkAudit = async () => {
        if (!user || selectedRows.length === 0) return;
        
        const leadsToAudit = leads.filter(l => selectedRows.includes(l.id) && (l.company_website || l.source_url));
        
        if (leadsToAudit.length === 0) {
            toast.error('None of the selected leads have a valid website URL.');
            return;
        }

        setIsAuditingBulk(true);
        setBulkAuditProgress(0);
        const toastId = toast.loading(`Initiating bulk audit for ${leadsToAudit.length} leads...`);
        
        let completed = 0;
        const total = leadsToAudit.length;
        const batchSize = 3;

        // Clone current leads to avoid closure issues with setLeads in loops
        let currentLeads = [...leads];

        for (let i = 0; i < leadsToAudit.length; i += batchSize) {
            const batch = leadsToAudit.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (lead) => {
                const url = lead.company_website || lead.source_url;
                try {
                    const { data, error } = await supabase.functions.invoke('audit-lead', {
                        body: { leadId: lead.id, url, userId: user.id }
                    });

                    if (!error && data?.success) {
                        const auditData = data.data;
                        currentLeads = currentLeads.map(l => 
                            l.id === lead.id ? { 
                                ...l, 
                                audit_score: auditData.score,
                                lighthouse_performance: auditData.lighthouse_performance,
                                lighthouse_accessibility: auditData.lighthouse_accessibility,
                                lighthouse_best_practices: auditData.lighthouse_best_practices,
                                lighthouse_seo: auditData.lighthouse_seo,
                                load_time_ms: auditData.load_time_ms,
                                ssl_enabled: auditData.ssl_enabled,
                                mobile_friendly: auditData.mobile_friendly,
                                audit_data: auditData.audit_data
                            } : l
                        );
                    }
                } catch (err) {
                    console.error(`Bulk audit failed for lead ${lead.id}:`, err);
                } finally {
                    completed++;
                    const progress = Math.round((completed / total) * 100);
                    setBulkAuditProgress(progress);
                    toast.loading(`Auditing... ${progress}% (${completed}/${total})`, { id: toastId });
                }
            }));

            // Intermediate state update after each batch to show progress in UI
            setLeads(currentLeads);
        }

        toast.success(`Bulk audit finished! ${completed} leads processed.`, { id: toastId });
        setIsAuditingBulk(false);
        setBulkAuditProgress(0);
        setSelectedRows([]);
    };

    const handleUpdateLead = async (updates: Partial<Lead>) => {
        if (!editingLead) return;
        
        try {
            const { error: updateError } = await supabase
                .from('leads')
                .update({ ...updates, source: editSource })
                .eq('id', editingLead.id);
                
            if (updateError) throw updateError;
            
            setLeads(leads.map(lead => 
                lead.id === editingLead.id ? { ...lead, ...updates, source: editSource } : lead
            ));
            setEditingLead(null);
            toast.success('Lead updated');
        } catch (error) {
            console.error('Error updating lead:', error);
            toast.error('Failed to update lead');
        }
    };

    const toggleRow = (id: string) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter(rowId => rowId !== id));
        } else {
            setSelectedRows([...selectedRows, id]);
        }
    };

    const toggleAll = () => {
        if (selectedRows.length === leads.length && leads.length > 0) {
            setSelectedRows([]);
        } else {
            setSelectedRows(leads.map(lead => lead.id));
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            new: 'bg-blue-50 text-blue-700 border-blue-200',
            contacted: 'bg-yellow-50 text-yellow-700 border-yellow-200',
            interested: 'bg-purple-50 text-purple-700 border-purple-200',
            closed: 'bg-green-50 text-green-700 border-green-200',
        };
        const defaultStyle = 'bg-slate-50 text-slate-700 border-slate-200';
        const normalizedStatus = status ? status.toLowerCase() : 'new';
        return (
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[normalizedStatus] || defaultStyle}`}>
                {normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}
            </span>
        );
    };

    const uniqueCompanies = Array.from(new Set(leads.map(l => l.company).filter(Boolean))).sort();

    const filteredLeads = leads
        .filter(lead => {
            const text = `${lead.first_name || ''} ${lead.last_name || ''} ${lead.email || ''} ${lead.company || ''} ${lead.industry || ''}`.toLowerCase();
            const matchesSearch = text.includes(searchTerm.toLowerCase());
            const matchesCompany = companyFilter === 'all' || lead.company === companyFilter;
            const matchesSource = sourceFilter === 'all' || (lead.source || 'scraper') === sourceFilter;
            return matchesSearch && matchesCompany && matchesSource;
        })
        .sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            if (sortBy === 'name') {
                const nameA = (`${a.first_name || ''} ${a.last_name || ''}`.trim()) || a.company || '';
                const nameB = (`${b.first_name || ''} ${b.last_name || ''}`.trim()) || b.company || '';
                return nameA.localeCompare(nameB);
            }
            if (sortBy === 'company') return (a.company || '').localeCompare(b.company || '');
            if (sortBy === 'score') return (Number(b.icp_score) || 0) - (Number(a.icp_score) || 0);
            return 0;
        });

    const auditStats = useMemo(() => {
        const auditedLeads = filteredLeads.filter(l => l.audit_score !== undefined && l.audit_score !== null);
        if (auditedLeads.length === 0) return null;

        const total = auditedLeads.length;
        const sum = (acc: number, val: number | undefined | null) => acc + (val || 0);
        
        return {
            avgScore: Math.round(auditedLeads.reduce((acc, l) => sum(acc, l.audit_score), 0) / total),
            avgPerf: Math.round(auditedLeads.reduce((acc, l) => sum(acc, l.lighthouse_performance), 0) / total),
            avgSEO: Math.round(auditedLeads.reduce((acc, l) => sum(acc, l.lighthouse_seo), 0) / total),
            avgAcc: Math.round(auditedLeads.reduce((acc, l) => sum(acc, l.lighthouse_accessibility), 0) / total),
            avgBest: Math.round(auditedLeads.reduce((acc, l) => sum(acc, l.lighthouse_best_practices), 0) / total),
            sslEnabledRate: Math.round((auditedLeads.filter(l => l.ssl_enabled).length / total) * 100),
            mobileFriendlyRate: Math.round((auditedLeads.filter(l => l.mobile_friendly).length / total) * 100),
            total
        };
    }, [filteredLeads]);

    return (
        <AppContainer title="Leads List">
            <div className="flex flex-col gap-6">
                {/* Health Overview Dashboard */}
                {auditStats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Activity size={20} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Health Score</span>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900">{auditStats.avgScore}/100</div>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${auditStats.avgScore}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                    <Zap size={20} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Performance</span>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900">{auditStats.avgPerf}%</div>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: `${auditStats.avgPerf}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                    <Search size={20} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg SEO Score</span>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900">{auditStats.avgSEO}%</div>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500" style={{ width: `${auditStats.avgSEO}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                                    <ShieldCheck size={20} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Security Mix</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                                    <span>SSL Ready</span>
                                    <span className="text-slate-900">{auditStats.sslEnabledRate}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500" style={{ width: `${auditStats.sslEnabledRate}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#1b57b1]/10 flex items-center justify-center text-[#1b57b1] shadow-inner">
                            <Users size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                {campaignId && (
                                    <button 
                                        onClick={() => window.history.back()}
                                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                                        title="Back to Campaigns"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                )}
                                <h3 className="text-xl font-bold text-slate-900 leading-tight">
                                    {campaignName ? `Leads for ${campaignName}` : (
                                        industryFilter ? `Industry: ${industryFilter}` : 
                                        (minScore || maxScore) ? `ICP Score: ${minScore || 0}-${maxScore || 10}` :
                                        `${leads.length.toLocaleString()} ${leads.length === 1 ? 'Verified Lead' : 'Verified Leads'}`
                                    )}
                                </h3>
                            </div>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">
                                {campaignName ? `Showing leads extracted for this campaign.` : 
                                 industryFilter ? `Showing leads in the ${industryFilter} industry.` :
                                 (minScore || maxScore) ? `Showing leads matching your ICP criteria.` :
                                 'Manage and export your extracted business contacts.'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        {(industryFilter || minScore || maxScore || campaignId || companyFilter !== 'all' || sourceFilter !== 'all') && (
                            <button 
                                onClick={() => {
                                    setSearchTerm('');
                                    setSearchParams({});
                                    setCompanyFilter('all');
                                    setSourceFilter('all');
                                }}
                                className="w-full sm:w-auto px-6 h-[46px] md:h-[52px] border border-red-200 bg-red-50 rounded-xl text-sm font-bold text-red-600 hover:bg-red-100 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                            >
                                <X size={18} />
                                Clear Filter
                            </button>
                        )}
                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:flex items-center gap-2 md:gap-3 w-full sm:w-auto">
                            <div className="relative group flex-1 sm:flex-none">
                                <button 
                                    onClick={handleImportCSV}
                                    className="w-full px-6 h-[46px] md:h-[52px] border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm whitespace-nowrap"
                                >
                                    <Upload size={16} />
                                    Import
                                </button>
                                <button 
                                    onClick={handleDownloadSampleCSV}
                                    className="hidden sm:block absolute -bottom-5 left-0 right-0 text-[10px] text-[#1b57b1] hover:text-[#154690] hover:underline font-bold text-center transition-all opacity-80 hover:opacity-100 whitespace-nowrap"
                                >
                                    Sample
                                </button>
                            </div>
                            <button 
                                onClick={handleExportCSV}
                                className="flex-1 sm:flex-none px-6 h-[46px] md:h-[52px] border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm whitespace-nowrap"
                            >
                                <Download size={16} />
                                Export
                            </button>
                            <button 
                                onClick={() => setShowBulkEmail(true)}
                                className="col-span-2 xs:col-span-1 flex-1 sm:flex-none px-6 h-[46px] md:h-[52px] bg-[#1b57b1] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-[#154690] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1b57b1]/20 cursor-pointer whitespace-nowrap"
                            >
                                <Mail size={16} />
                                Email
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept=".csv" 
                                className="hidden" 
                            />
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col relative z-[30]">
                    <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 rounded-t-2xl relative z-[40]">
                        <div className="relative w-full sm:w-80 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1b57b1] transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search leads by name, email, or company..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-11 h-[46px] md:h-[56px] text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1]/20 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap justify-end relative z-[50]">
                            {selectedRows.length > 0 && (
                                <>
                                    <button
                                        onClick={handleBulkAudit}
                                        disabled={isAuditingBulk}
                                        className="h-[46px] md:h-[56px] flex items-center gap-2 px-6 bg-blue-50 border border-blue-200 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all shadow-sm cursor-pointer whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300 disabled:opacity-50"
                                    >
                                        {isAuditingBulk ? (
                                            <>
                                                <Loader2 className="animate-spin text-blue-500" size={16} />
                                                <span>Auditing {bulkAuditProgress}%</span>
                                            </>
                                        ) : (
                                            <>
                                                <Activity size={18} />
                                                <span>Audit Selected</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const selectedLeads = leads.filter(l => selectedRows.includes(l.id));
                                            setLeadsToAssign(selectedLeads);
                                            setShowAssignModal(true);
                                        }}
                                        className="h-[46px] md:h-[56px] flex items-center gap-2 px-6 bg-[#1b57b1]/5 border border-[#1b57b1] text-[#1b57b1] rounded-xl text-sm font-bold hover:bg-[#1b57b1]/10 transition-all shadow-sm cursor-pointer whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300"
                                    >
                                        <Target size={18} />
                                        Assign to Campaign ({selectedRows.length})
                                    </button>
                                </>
                            )}
                             {/* Company Filter */}
                            <CustomSelect
                                value={companyFilter}
                                onChange={setCompanyFilter}
                                className="min-w-[140px]"
                                options={[
                                    { label: 'All Companies', value: 'all' },
                                    ...uniqueCompanies.map(company => ({ label: company, value: company }))
                                ]}
                            />

                            {/* Source Filter */}
                            <CustomSelect
                                value={sourceFilter}
                                onChange={setSourceFilter}
                                className="min-w-[140px]"
                                options={[
                                    { label: 'All Sources', value: 'all' },
                                    { label: 'CSV Import', value: 'csv' },
                                    { label: 'Lead Scraper', value: 'scraper' }
                                ]}
                            />

                            {/* Sort Filter */}
                            <CustomSelect
                                value={sortBy}
                                onChange={setSortBy}
                                className="min-w-[140px] xs:min-w-[160px]"
                                isBold
                                options={[
                                    { label: 'Sort by: Newest', value: 'newest' },
                                    { label: 'Sort by: Oldest', value: 'oldest' },
                                    { label: 'Sort by: Name (A-Z)', value: 'name' },
                                    { label: 'Sort by: Company (A-Z)', value: 'company' },
                                    { label: 'Sort by: ICP Score', value: 'score' }
                                ]}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto pb-4 rounded-b-2xl">
                        <table className="w-full min-w-[1300px] text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="p-4 w-12 text-center md:sticky md:left-0 z-[110] bg-slate-50 md:shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                                        <button onClick={toggleAll} className="text-slate-400 hover:text-[#1b57b1] transition-colors focus:outline-none">
                                            {selectedRows.length === leads.length && leads.length > 0 ? (
                                                <CheckCircle2 size={20} className="text-[#1b57b1] fill-[#1b57b1]/10" />
                                            ) : (
                                                <Circle size={20} />
                                            )}
                                        </button>
                                    </th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest md:sticky md:left-12 z-[110] bg-slate-50 md:shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">Name</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Company</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Industry</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">ICP</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Site Health</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tech Stack</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Founded</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Date Created</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Source</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Email Sent</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right sticky right-0 z-[110] bg-slate-50 shadow-[-1px_0_0_0_rgba(0,0,0,0.05)]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.length > 0 ? (
                                    filteredLeads.map((lead, index) => (
                                        <tr 
                                            key={lead.id} 
                                            className={`border-b border-slate-50 hover:bg-slate-50 transition-colors group ${index === filteredLeads.length - 1 ? 'border-none' : ''} ${selectedRows.includes(lead.id) ? 'bg-blue-50/50' : ''} ${dropdownOpenId === lead.id ? 'z-[101] relative' : ''}`}
                                        >
                                            <td className="p-4 text-center md:sticky md:left-0 z-[100] bg-white group-hover:bg-slate-50 transition-colors md:shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                                                <button onClick={(e) => { e.stopPropagation(); toggleRow(lead.id); }} className="text-slate-300 group-hover:text-slate-400 hover:!text-[#1b57b1] transition-colors focus:outline-none">
                                                    {selectedRows.includes(lead.id) ? (
                                                        <CheckCircle2 size={20} className="text-[#1b57b1] fill-[#1b57b1]/10" />
                                                    ) : (
                                                        <Circle size={20} />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="p-4 md:sticky md:left-12 z-[100] bg-white group-hover:bg-slate-50 transition-colors md:shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 uppercase">
                                                        {(lead.first_name?.[0] || lead.last_name?.[0] || lead.company?.[0] || lead.email[0])}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">
                                                            {lead.first_name || lead.last_name
                                                                ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                                                                : (lead.company || lead.email)}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{lead.email}</p>
                                                        <div className="flex items-center gap-1.5 mt-1.5 relative z-10">
                                                            {lead.company_website && (
                                                                <a 
                                                                    href={lead.company_website} 
                                                                    target="_blank" 
                                                                    rel="noopener" 
                                                                    className="p-1 text-slate-400 hover:text-[#1b57b1] hover:bg-white rounded transition-all shadow-sm border border-transparent hover:border-slate-100" 
                                                                    title="Visit Website"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Globe size={14} />
                                                                </a>
                                                            )}
                                                            {lead.linkedin_url && (
                                                                <a 
                                                                    href={lead.linkedin_url} 
                                                                    target="_blank" 
                                                                    rel="noopener" 
                                                                    className="p-1 text-slate-400 hover:text-[#0077b5] hover:bg-white rounded transition-all shadow-sm border border-transparent hover:border-slate-100" 
                                                                    title="LinkedIn Profile"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                                                </a>
                                                            )}
                                                            {lead.twitter_url && (
                                                                <a 
                                                                    href={lead.twitter_url} 
                                                                    target="_blank" 
                                                                    rel="noopener" 
                                                                    className="p-1 text-slate-400 hover:text-[#1da1f2] hover:bg-white rounded transition-all shadow-sm border border-transparent hover:border-slate-100" 
                                                                    title="Twitter/X Profile"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                                                                </a>
                                                            )}
                                                            {lead.facebook_url && (
                                                                <a href={lead.facebook_url} target="_blank" rel="noopener noreferrer" title="Facebook" className="p-1 text-slate-400 hover:text-[#1877f2] hover:bg-white rounded transition-all shadow-sm border border-transparent hover:border-slate-100" onClick={(e) => e.stopPropagation()}>
                                                                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm font-medium text-slate-700 max-w-[150px] truncate">{lead.company || '-'}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider truncate inline-block max-w-[120px]">
                                                    {lead.industry || 'General'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${
                                                    Number(lead.icp_score) >= 7 ? 'bg-green-50 text-green-700 border border-green-100' :
                                                    Number(lead.icp_score) >= 4 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                    'bg-slate-50 text-slate-500 border border-slate-100'
                                                }`}>
                                                    {lead.icp_score || 0}%
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {lead.audit_score !== null && lead.audit_score !== undefined ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${
                                                            lead.audit_score >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                            lead.audit_score >= 50 ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                                                            'bg-red-50 text-red-700 border border-red-100'
                                                        }`}>
                                                            {lead.audit_score}/100
                                                        </span>
                                                        <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${
                                                                    lead.audit_score >= 80 ? 'bg-emerald-500' :
                                                                    lead.audit_score >= 50 ? 'bg-orange-500' :
                                                                    'bg-red-500'
                                                                }`}
                                                                style={{ width: `${lead.audit_score}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleAuditLead(lead); }}
                                                        className="text-[10px] font-bold text-[#1b57b1] hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
                                                    >
                                                        <HeartPulse size={12} />
                                                        Audit
                                                    </button>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="max-w-[180px] flex flex-wrap gap-1">
                                                    {lead.technographics && lead.technographics.length > 0 ? (
                                                        lead.technographics.slice(0, 2).map((tech, idx) => (
                                                            <span key={idx} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-medium border border-indigo-100">
                                                                {tech}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-slate-300 italic text-[10px]">None</span>
                                                    )}
                                                    {lead.technographics && lead.technographics.length > 2 && (
                                                        <span className="text-[9px] text-slate-400">+{lead.technographics.length - 2}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-slate-500 font-medium">
                                                {lead.founded_year || '—'}
                                            </td>
                                            <td className="p-4">
                                                {getStatusBadge(lead.status)}
                                            </td>
                                            <td className="p-4 text-sm text-slate-500 font-medium whitespace-nowrap">{lead.created_at}</td>
                                            <td className="p-4">
                                                {lead.source === 'csv' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-100 whitespace-nowrap">
                                                        <FileText size={12} />
                                                        CSV Import
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border bg-purple-50 text-purple-700 border-purple-100 whitespace-nowrap">
                                                        <Database size={12} />
                                                        Lead Scraper
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {emailStatusMap[lead.id]?.status === 'sent' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border bg-green-50 text-green-700 border-green-200 whitespace-nowrap">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                                                        Sent
                                                    </span>
                                                ) : emailStatusMap[lead.id]?.status === 'failed' ? (
                                                    <span
                                                        title={emailStatusMap[lead.id]?.error || 'Email delivery failed'}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border bg-red-50 text-red-600 border-red-200 whitespace-nowrap cursor-help"
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                                                        Failed ⓘ
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border bg-slate-50 text-slate-400 border-slate-200 whitespace-nowrap">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block"></span>
                                                        Not Sent
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`p-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 transition-all shadow-[-1px_0_0_0_rgba(0,0,0,0.05)] ${dropdownOpenId === lead.id ? 'z-[101]' : 'z-[100]'}`}>
                                                <div className="relative inline-block text-left">
                                                    <button
                                                        onClick={() => setDropdownOpenId(dropdownOpenId === lead.id ? null : lead.id)}
                                                        className="dropdown-toggle p-2 text-slate-400 hover:bg-white hover:text-slate-700 rounded-lg hover:shadow-sm border border-transparent hover:border-slate-200 transition-all cursor-pointer relative z-10"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>
                                                    {dropdownOpenId === lead.id && (
                                                        <div
                                                            ref={dropdownRef}
                                                            className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-2xl border border-slate-100 z-[102] overflow-hidden"
                                                        >
                                                            {/* Email options group */}
                                                            <div className="px-2 pt-2 pb-1">
                                                                <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Options</p>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setViewingLead(lead); setDropdownOpenId(null); }}
                                                                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#1b57b1]/5 hover:text-[#1b57b1] rounded-lg transition-colors group/item"
                                                                >
                                                                    <Eye size={16} className="text-slate-400 group-hover/item:text-[#1b57b1]" />
                                                                    View Details
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setSingleEmailLead(lead); setDropdownOpenId(null); }}
                                                                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#1b57b1]/5 hover:text-[#1b57b1] rounded-lg transition-colors group/item"
                                                                >
                                                                    <Send size={16} className="text-slate-400 group-hover/item:text-[#1b57b1]" />
                                                                    Send Email (1:1)
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setDropdownOpenId(null); setSelectedRows([lead.id]); setShowBulkEmail(true); }}
                                                                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#1b57b1]/5 hover:text-[#1b57b1] rounded-lg transition-colors group/item"
                                                                >
                                                                    <Mail size={16} className="text-slate-400 group-hover/item:text-[#1b57b1]" />
                                                                    Add to Bulk Email
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { handleAuditLead(lead); setDropdownOpenId(null); }}
                                                                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#1b57b1]/5 hover:text-[#1b57b1] rounded-lg transition-colors group/item"
                                                                >
                                                                    <HeartPulse size={16} className="text-slate-400 group-hover/item:text-[#1b57b1]" />
                                                                    Audit Website
                                                                </button>
                                                            </div>

                                                            {/* Lead management group */}
                                                            <div className="px-2 py-1 border-t border-slate-50">
                                                                <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lead</p>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setEditingLead(lead); setDropdownOpenId(null); }}
                                                                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#1b57b1]/5 hover:text-[#1b57b1] rounded-lg transition-colors group/item"
                                                                >
                                                                    <Edit2 size={16} className="text-slate-400 group-hover/item:text-[#1b57b1]" />
                                                                    Edit Lead
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setLeadsToAssign([lead]); setShowAssignModal(true); setDropdownOpenId(null); }}
                                                                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#1b57b1]/5 hover:text-[#1b57b1] rounded-lg transition-colors group/item"
                                                                >
                                                                    <Target size={16} className="text-slate-400 group-hover/item:text-[#1b57b1]" />
                                                                    Assign to Campaign
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={async () => {
                                                                        const { data, error } = await supabase.from('leads').insert([{ ...lead, id: undefined, created_at: undefined }]).select().single();
                                                                        if (data) {
                                                                            addLead(data);
                                                                            toast.success('Lead duplicated successfully');
                                                                        }
                                                                        setDropdownOpenId(null);
                                                                    }}
                                                                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#1b57b1]/5 hover:text-[#1b57b1] rounded-lg transition-colors group/item"
                                                                >
                                                                    <Copy size={16} className="text-slate-400 group-hover/item:text-[#1b57b1]" />
                                                                    Duplicate
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { handleDeleteLead(lead.id); setDropdownOpenId(null); }}
                                                                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors group/item"
                                                                >
                                                                    <Trash2 size={16} className="text-red-400 group-hover/item:text-red-600" />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={11} className="p-8 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                {loading ? (
                                                    <Loader2 className="animate-spin text-[#1b57b1]" size={32} />
                                                ) : (
                                                    <>
                                                        <Search size={32} className="text-slate-300" />
                                                        <p className="font-medium text-slate-600">No leads found</p>
                                                        <p className="text-sm">Try tweaking your search query.</p>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm bg-slate-50/50">
                        <span className="text-slate-500 font-medium">
                            Showing <span className="text-slate-900 font-bold">1-{filteredLeads.length}</span> of <span className="text-slate-900 font-bold">{leads.length.toLocaleString()}</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <button className="px-3 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-white disabled:opacity-50 transition-all disabled:cursor-not-allowed" disabled>Previous</button>
                            <button className="px-3 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-white transition-all bg-white shadow-sm ring-1 ring-slate-200">1</button>
                            <button className="px-3 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-white transition-all disabled:opacity-50" disabled>Next</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Email Modal (multiple leads) */}
            {showBulkEmail && user && (
                <BulkEmailModal
                    leads={filteredLeads}
                    selectedIds={selectedRows}
                    senderName={user.full_name || ''}
                    senderEmail={user.email || ''}
                    userId={user.id}
                    onClose={() => setShowBulkEmail(false)}
                    onSuccess={(sent) => {
                        setShowBulkEmail(false);
                        setSelectedRows([]);
                        fetchEmailLogs();
                        addNotification({
                            title: 'Bulk Email Sent',
                            message: `Successfully sent emails to ${sent} lead${sent !== 1 ? 's' : ''}.`,
                            type: 'success',
                        });
                    }}
                />
            )}

            {/* Single Lead Email Modal (1:1) */}
            {singleEmailLead && user && (
                <BulkEmailModal
                    leads={[singleEmailLead]}
                    selectedIds={[singleEmailLead.id]}
                    senderName={user.full_name || ''}
                    senderEmail={user.email || ''}
                    userId={user.id}
                    onClose={() => setSingleEmailLead(null)}
                    onSuccess={(sent) => {
                        setSingleEmailLead(null);
                        fetchEmailLogs();
                        addNotification({
                            title: 'Email Sent',
                            message: `Email successfully sent to ${singleEmailLead.email}.`,
                            type: 'success',
                        });
                        toast.success(`Email sent to ${singleEmailLead.email}`);
                    }}
                />
            )}

            {/* Edit Lead Modal */}
            {editingLead && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-900">Edit Lead Details</h3>
                            <button onClick={() => setEditingLead(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            handleUpdateLead({
                                first_name: formData.get('first_name') as string,
                                last_name: formData.get('last_name') as string,
                                company: formData.get('company') as string,
                                industry: formData.get('industry') as string,
                                source: formData.get('source') as string,
                                phone: formData.get('phone') as string,
                                company_website: formData.get('company_website') as string,
                                linkedin_url: formData.get('linkedin_url') as string,
                                twitter_url: formData.get('twitter_url') as string,
                                facebook_url: formData.get('facebook_url') as string,
                                logo_url: formData.get('logo_url') as string,
                                business_description: formData.get('business_description') as string,
                                founded_year: formData.get('founded_year') as string,
                                technographics: (formData.get('technographics') as string)?.split(';').map(s => s.trim()).filter(Boolean),
                                meta_title: formData.get('meta_title') as string,
                                meta_description: formData.get('meta_description') as string,
                                primary_keywords: (formData.get('primary_keywords') as string)?.split(';').map(s => s.trim()).filter(Boolean),
                                website_language: formData.get('website_language') as string,
                                career_page_url: formData.get('career_page_url') as string,
                                open_positions_count: parseInt(formData.get('open_positions_count') as string) || 0,
                            });
                        }} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">First Name</label>
                                    <input 
                                        name="first_name" 
                                        defaultValue={editingLead.first_name || ''} 
                                        placeholder="Enter first name"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Last Name</label>
                                    <input 
                                        name="last_name" 
                                        defaultValue={editingLead.last_name || ''} 
                                        placeholder="Enter last name"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Company</label>
                                    <input 
                                        name="company" 
                                        defaultValue={editingLead.company || ''} 
                                        placeholder="Enter company name"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Industry</label>
                                    <input 
                                        name="industry" 
                                        defaultValue={editingLead.industry || ''} 
                                        placeholder="e.g. Technology, Healthcare"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Contact & Social Section */}
                            <div className="space-y-4 pt-2 border-t border-slate-100 mt-4">
                                <h4 className="text-[10px] font-bold text-[#1b57b1] uppercase tracking-widest">Contact & Presence</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 pl-1">Phone</label>
                                        <input 
                                            name="phone" 
                                            defaultValue={editingLead.phone || ''} 
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 pl-1">Website</label>
                                        <input 
                                            name="company_website" 
                                            defaultValue={editingLead.company_website || ''} 
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-[#0077b5] pl-1">LinkedIn</label>
                                        <input 
                                            name="linkedin_url" 
                                            defaultValue={editingLead.linkedin_url || ''} 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-4 focus:ring-[#0077b5]/10 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-[#1da1f2] pl-1">Twitter</label>
                                        <input 
                                            name="twitter_url" 
                                            defaultValue={editingLead.twitter_url || ''} 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-4 focus:ring-[#1da1f2]/10 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-[#1877f2] pl-1">Facebook</label>
                                    <input 
                                        name="facebook_url" 
                                        defaultValue={editingLead.facebook_url || ''} 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-4 focus:ring-[#1877f2]/10 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Advanced Data Section */}
                            <div className="space-y-4 pt-4 border-t border-slate-100 mt-4">
                                <h4 className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Business Insights</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 pl-1">Founded Year</label>
                                        <input 
                                            name="founded_year" 
                                            defaultValue={editingLead.founded_year || ''} 
                                            placeholder="e.g. 2004"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-4 focus:ring-purple-100"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 pl-1">Logo URL</label>
                                        <input 
                                            name="logo_url" 
                                            defaultValue={editingLead.logo_url || ''} 
                                            placeholder="https://..."
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-4 focus:ring-purple-100"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 pl-1">Business Description</label>
                                    <textarea 
                                        name="business_description" 
                                        defaultValue={editingLead.business_description || ''} 
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none transition-all h-20 focus:ring-4 focus:ring-purple-100 resize-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 pl-1">Technographics (Semi-colon separated)</label>
                                    <input 
                                        name="technographics" 
                                        defaultValue={(editingLead.technographics || []).join('; ')} 
                                        placeholder="React; Node.js; AWS"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-4 focus:ring-purple-100"
                                    />
                                </div>
                            </div>

                            {/* SEO & Growth Section */}
                            <div className="space-y-4 pt-4 border-t border-slate-100 mt-4">
                                <h4 className="text-[10px] font-bold text-green-600 uppercase tracking-widest">SEO & Growth</h4>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 pl-1">Meta Title</label>
                                    <input 
                                        name="meta_title" 
                                        defaultValue={editingLead.meta_title || ''} 
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-4 focus:ring-green-100"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 pl-1">Meta Description</label>
                                    <textarea 
                                        name="meta_description" 
                                        defaultValue={editingLead.meta_description || ''} 
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none transition-all h-20 focus:ring-4 focus:ring-green-100 resize-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 pl-1">Keywords (Semi-colon separated)</label>
                                    <input 
                                        name="primary_keywords" 
                                        defaultValue={(editingLead.primary_keywords || []).join('; ')} 
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-4 focus:ring-green-100"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 pl-1">Language</label>
                                        <input 
                                            name="website_language" 
                                            defaultValue={editingLead.website_language || ''} 
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-4 focus:ring-green-100"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 pl-1">Job Openings</label>
                                        <input 
                                            name="open_positions_count" 
                                            type="number"
                                            defaultValue={editingLead.open_positions_count || 0} 
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-4 focus:ring-green-100"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 pl-1">Career Page URL</label>
                                    <input 
                                        name="career_page_url" 
                                        defaultValue={editingLead.career_page_url || ''} 
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-4 focus:ring-green-100"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-slate-100 mt-4 relative z-[100]">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Lead Source</label>
                                <CustomSelect
                                    value={editSource}
                                    onChange={setEditSource}
                                    options={[
                                        { label: 'Lead Scraper', value: 'scraper' },
                                        { label: 'CSV Import', value: 'csv' }
                                    ]}
                                />
                            </div>
                            <div className="space-y-1.5 opacity-60">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Email (Read Only)</label>
                                <input 
                                    value={editingLead.email} 
                                    disabled 
                                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setEditingLead(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-[#1b57b1] text-white rounded-xl text-sm font-bold hover:bg-[#154690] transition-all shadow-lg shadow-[#1b57b1]/20">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Lead Details Modal */}
            {viewingLead && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#1b57b1] flex items-center justify-center text-white shadow-lg shadow-[#1b57b1]/20">
                                    {viewingLead.logo_url ? (
                                        <img src={viewingLead.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
                                    ) : (
                                        <Users size={24} />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">
                                        {viewingLead.first_name || viewingLead.last_name 
                                            ? `${viewingLead.first_name || ''} ${viewingLead.last_name || ''}`.trim()
                                            : viewingLead.company || 'Unnamed Lead'}
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium">{viewingLead.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => { setEditingLead(viewingLead); setViewingLead(null); }}
                                    className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm font-bold text-slate-600 flex items-center gap-2"
                                >
                                    <Edit2 size={16} />
                                    Edit
                                </button>
                                <button onClick={() => setViewingLead(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Grid Layout for details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Contact Card */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-[#1b57b1]">
                                        <Mail size={16} />
                                        <h4 className="text-xs font-bold uppercase tracking-widest">Contact Information</h4>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Email Address</p>
                                            <p className="text-sm font-medium text-slate-900 break-all">{viewingLead.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</p>
                                            <p className="text-sm font-medium text-slate-900">{viewingLead.phone || 'Not available'}</p>
                                        </div>
                                        <div className="pt-2 flex flex-wrap gap-2">
                                            {viewingLead.linkedin_url && (
                                                <a href={viewingLead.linkedin_url} target="_blank" rel="noopener" className="p-2 bg-white rounded-lg border border-slate-200 text-[#0077b5] hover:shadow-md transition-all">
                                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                                </a>
                                            )}
                                            {viewingLead.twitter_url && (
                                                <a href={viewingLead.twitter_url} target="_blank" rel="noopener" className="p-2 bg-white rounded-lg border border-slate-200 text-[#1da1f2] hover:shadow-md transition-all">
                                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                                                </a>
                                            )}
                                            {viewingLead.facebook_url && (
                                                <a href={viewingLead.facebook_url} target="_blank" rel="noopener" className="p-2 bg-white rounded-lg border border-slate-200 text-[#1877f2] hover:shadow-md transition-all">
                                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                                </a>
                                            )}
                                            {viewingLead.company_website && (
                                                <a href={viewingLead.company_website} target="_blank" rel="noopener" className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:shadow-md transition-all">
                                                    <Globe size={20} />
                                                </a>
                                            )}
                                        </div>
                                        <div className="pt-4 mt-2 border-t border-slate-100">
                                            <button 
                                                onClick={() => handleGeneratePDF(viewingLead)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1b57b1] text-white rounded-xl text-xs font-bold hover:bg-[#1b57b1]/90 transition-all shadow-sm cursor-pointer"
                                            >
                                                <FileText size={14} />
                                                Generate PDF Report
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Business Card */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-purple-600">
                                        <Database size={16} />
                                        <h4 className="text-xs font-bold uppercase tracking-widest">Business Insights</h4>
                                    </div>
                                    <div className="bg-purple-50/50 rounded-2xl p-5 space-y-4 border border-purple-100">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Company Name</p>
                                            <p className="text-sm font-bold text-slate-900">{viewingLead.company || 'Not available'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Industry</p>
                                            <p className="text-sm font-medium text-slate-900">{viewingLead.industry || 'General'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Founded</p>
                                            <p className="text-sm font-medium text-slate-900">{viewingLead.founded_year || 'Unknown'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">ICP Score</p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${viewingLead.icp_score || 0}%` }}></div>
                                                </div>
                                                <span className="text-sm font-bold text-purple-700">{viewingLead.icp_score || 0}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* SEO Card */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-green-600">
                                        <Globe size={16} />
                                        <h4 className="text-xs font-bold uppercase tracking-widest">SEO & Presence</h4>
                                    </div>
                                    <div className="bg-green-50/50 rounded-2xl p-5 space-y-4 border border-green-100">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Meta Title</p>
                                            <p className="text-sm font-medium text-slate-900 line-clamp-2">{viewingLead.meta_title || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Language</p>
                                            <p className="text-sm font-medium text-slate-900 capitalize">{viewingLead.website_language || 'Detecting...'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Active Jobs</p>
                                            <p className="text-sm font-medium text-slate-900">{viewingLead.open_positions_count || 0} listings</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Website Audit Card (New) */}
                                {viewingLead.audit_score !== null && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <Activity size={16} />
                                            <h4 className="text-xs font-bold uppercase tracking-widest">Website Audit</h4>
                                        </div>
                                        <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex flex-col">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Overall Health</p>
                                                    <p className="text-[10px] text-slate-500 italic">Advanced Audit Score</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-lg font-bold ${
                                                        (viewingLead.audit_score ?? 0) >= 80 ? 'text-emerald-600' :
                                                        (viewingLead.audit_score ?? 0) >= 50 ? 'text-orange-600' : 'text-red-600'
                                                    }`}>
                                                        {viewingLead.audit_score}/100
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-6">
                                                <div 
                                                    className={`h-full ${
                                                        (viewingLead.audit_score ?? 0) >= 80 ? 'bg-emerald-500' :
                                                        (viewingLead.audit_score ?? 0) >= 50 ? 'bg-orange-500' : 'bg-red-500'
                                                    }`}
                                                    style={{ width: `${viewingLead.audit_score}%` }}
                                                ></div>
                                            </div>

                                            {/* Lighthouse Scores Section */}
                                            {viewingLead.lighthouse_performance !== null && (
                                                <div className="grid grid-cols-4 gap-2 py-4 border-b border-blue-100/50">
                                                    <div className="flex flex-col items-center text-center gap-1">
                                                        <div className={`p-2 rounded-lg ${(viewingLead.lighthouse_performance ?? 0) >= 90 ? 'bg-emerald-100 text-emerald-600' : (viewingLead.lighthouse_performance ?? 0) >= 50 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                                                            <Zap size={14} />
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase">Perf</span>
                                                        <span className="text-xs font-bold text-slate-700">{viewingLead.lighthouse_performance}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center text-center gap-1">
                                                        <div className={`p-2 rounded-lg ${(viewingLead.lighthouse_accessibility ?? 0) >= 90 ? 'bg-emerald-100 text-emerald-600' : (viewingLead.lighthouse_accessibility ?? 0) >= 50 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                                                            <Accessibility size={14} />
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase">Access</span>
                                                        <span className="text-xs font-bold text-slate-700">{viewingLead.lighthouse_accessibility}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center text-center gap-1">
                                                        <div className={`p-2 rounded-lg ${(viewingLead.lighthouse_best_practices ?? 0) >= 90 ? 'bg-emerald-100 text-emerald-600' : (viewingLead.lighthouse_best_practices ?? 0) >= 50 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                                                            <Award size={14} />
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase">Best</span>
                                                        <span className="text-xs font-bold text-slate-700">{viewingLead.lighthouse_best_practices}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center text-center gap-1">
                                                        <div className={`p-2 rounded-lg ${(viewingLead.lighthouse_seo ?? 0) >= 90 ? 'bg-emerald-100 text-emerald-600' : (viewingLead.lighthouse_seo ?? 0) >= 50 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                                                            <Search size={14} />
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase">SEO</span>
                                                        <span className="text-xs font-bold text-slate-700">{viewingLead.lighthouse_seo}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Detailed Checks Grid */}
                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    {viewingLead.ssl_enabled ? <ShieldCheck className="text-emerald-500" size={14} /> : <XCircle className="text-red-500" size={14} />}
                                                    <span className="text-xs">SSL Status</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    {(viewingLead.audit_data?.securityHeaders?.csp || viewingLead.audit_data?.securityHeaders?.xfo) ? <Lock className="text-emerald-500" size={14} /> : <XCircle className="text-orange-500" size={14} />}
                                                    <span className="text-xs">Header Defense</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    {viewingLead.audit_data?.hasH1 ? <Type className="text-emerald-500" size={14} /> : <XCircle className="text-orange-500" size={14} />}
                                                    <span className="text-xs">SEO Structure</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    {viewingLead.audit_data?.hasMetaDescription ? <FileSearch className="text-emerald-500" size={14} /> : <XCircle className="text-orange-500" size={14} />}
                                                    <span className="text-xs">Meta Optimized</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    {(viewingLead.audit_data?.imgCount > 0 && viewingLead.audit_data?.missingAltTagsCount === 0) || (viewingLead.audit_data?.imgCount === 0) || (viewingLead.lighthouse_accessibility ?? 0) >= 90 ? <Accessibility className="text-emerald-500" size={14} /> : <XCircle className="text-orange-500" size={14} />}
                                                    <span className="text-xs">Accessibility</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    {viewingLead.mobile_friendly ? <Globe className="text-emerald-500" size={14} /> : <XCircle className="text-red-500" size={14} />}
                                                    <span className="text-xs">Mobile Ready</span>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-blue-100/30 grid grid-cols-2 gap-4">
                                                <div className="flex items-center gap-2">
                                                    <Clock className={(viewingLead.load_time_ms || 0) < 3000 ? "text-emerald-500" : "text-orange-500"} size={14} />
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Load Speed:</span>
                                                    <span className="text-xs font-bold text-slate-700">
                                                        {viewingLead.load_time_ms ? `${(viewingLead.load_time_ms / 1000).toFixed(1)}s` : 'N/A'}
                                                    </span>
                                                </div>
                                                {viewingLead.audit_data?.broken_links_count !== undefined && (
                                                    <div className="flex items-center gap-2">
                                                        <Activity className={viewingLead.audit_data.broken_links_count === 0 ? "text-emerald-500" : "text-red-500"} size={14} />
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Broken Links:</span>
                                                        <span className="text-xs font-bold text-slate-700">{viewingLead.audit_data.broken_links_count}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Full Width Sections */}
                            <div className="space-y-6 pt-4">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Business Description</h4>
                                    <div className="bg-white border border-slate-100 rounded-2xl p-6 text-sm text-slate-600 leading-relaxed shadow-sm">
                                        {viewingLead.business_description || 'No business description was captured for this lead.'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Technographics</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {viewingLead.technographics && viewingLead.technographics.length > 0 ? (
                                                viewingLead.technographics.map((tech, idx) => (
                                                    <span key={idx} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100 flex items-center gap-1.5 shadow-sm">
                                                        <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                                        {tech}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-slate-400 italic text-sm">No technographics detected</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Keywords</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {viewingLead.primary_keywords && viewingLead.primary_keywords.length > 0 ? (
                                                viewingLead.primary_keywords.map((kw, idx) => (
                                                    <span key={idx} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                                                        # {kw}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-slate-400 italic text-sm">No keywords detected</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                                    <div className="flex items-center gap-4">
                                        <span>Source: <span className="text-[#1b57b1] font-bold uppercase">{viewingLead.source || 'scraper'}</span></span>
                                        <span>Lead ID: <span className="text-slate-600 font-mono">{viewingLead.id}</span></span>
                                    </div>
                                    <span>Created {viewingLead.created_at}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign to Campaign Modal */}
            <AssignToCampaignModal 
                open={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                leads={leadsToAssign}
                onSuccess={() => {
                    setShowAssignModal(false);
                    setSelectedRows([]);
                    fetchLeads(); // Refresh leads to show updated campaign association if needed
                }}
            />
        </AppContainer>
    );
};

export default LeadsList;
