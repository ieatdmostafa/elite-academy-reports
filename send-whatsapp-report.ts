import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { PDFDocument, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import fontkit from 'https://esm.sh/@pdf-lib/fontkit@1.1.1'

// ====== Constants ======
const WAWP_INSTANCE_ID = "91F53E6A9397";
const WAWP_ACCESS_TOKEN = "NJdrhpGtDNxrrM";
const YOUR_WHATSAPP_NUMBER = "201550688819";
const WEBSITE_URL = "https://elite-academy-reports-pi.vercel.app/";
const FONT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf";
const FONT_BOLD_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Bold.ttf";

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// ====== Arabic Reshaper ======
// Maps Arabic characters to their presentation forms: [isolated, final, initial, medial]
const ARABIC_FORMS: Record<number, number[]> = {
    0x0621: [0xFE80, 0xFE80, 0xFE80, 0xFE80], // ء
    0x0622: [0xFE81, 0xFE82, 0xFE81, 0xFE82], // آ
    0x0623: [0xFE83, 0xFE84, 0xFE83, 0xFE84], // أ
    0x0624: [0xFE85, 0xFE86, 0xFE85, 0xFE86], // ؤ
    0x0625: [0xFE87, 0xFE88, 0xFE87, 0xFE88], // إ
    0x0626: [0xFE89, 0xFE8A, 0xFE8B, 0xFE8C], // ئ
    0x0627: [0xFE8D, 0xFE8E, 0xFE8D, 0xFE8E], // ا
    0x0628: [0xFE8F, 0xFE90, 0xFE91, 0xFE92], // ب
    0x0629: [0xFE93, 0xFE94, 0xFE93, 0xFE94], // ة
    0x062A: [0xFE95, 0xFE96, 0xFE97, 0xFE98], // ت
    0x062B: [0xFE99, 0xFE9A, 0xFE9B, 0xFE9C], // ث
    0x062C: [0xFE9D, 0xFE9E, 0xFE9F, 0xFEA0], // ج
    0x062D: [0xFEA1, 0xFEA2, 0xFEA3, 0xFEA4], // ح
    0x062E: [0xFEA5, 0xFEA6, 0xFEA7, 0xFEA8], // خ
    0x062F: [0xFEA9, 0xFEAA, 0xFEA9, 0xFEAA], // د
    0x0630: [0xFEAB, 0xFEAC, 0xFEAB, 0xFEAC], // ذ
    0x0631: [0xFEAD, 0xFEAE, 0xFEAD, 0xFEAE], // ر
    0x0632: [0xFEAF, 0xFEB0, 0xFEAF, 0xFEB0], // ز
    0x0633: [0xFEB1, 0xFEB2, 0xFEB3, 0xFEB4], // س
    0x0634: [0xFEB5, 0xFEB6, 0xFEB7, 0xFEB8], // ش
    0x0635: [0xFEB9, 0xFEBA, 0xFEBB, 0xFEBC], // ص
    0x0636: [0xFEBD, 0xFEBE, 0xFEBF, 0xFEC0], // ض
    0x0637: [0xFEC1, 0xFEC2, 0xFEC3, 0xFEC4], // ط
    0x0638: [0xFEC5, 0xFEC6, 0xFEC7, 0xFEC8], // ظ
    0x0639: [0xFEC9, 0xFECA, 0xFECB, 0xFECC], // ع
    0x063A: [0xFECD, 0xFECE, 0xFECF, 0xFED0], // غ
    0x0640: [0x0640, 0x0640, 0x0640, 0x0640], // ـ (tatweel)
    0x0641: [0xFED1, 0xFED2, 0xFED3, 0xFED4], // ف
    0x0642: [0xFED5, 0xFED6, 0xFED7, 0xFED8], // ق
    0x0643: [0xFED9, 0xFEDA, 0xFEDB, 0xFEDC], // ك
    0x0644: [0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0], // ل
    0x0645: [0xFEE1, 0xFEE2, 0xFEE3, 0xFEE4], // م
    0x0646: [0xFEE5, 0xFEE6, 0xFEE7, 0xFEE8], // ن
    0x0647: [0xFEE9, 0xFEEA, 0xFEEB, 0xFEEC], // ه
    0x0648: [0xFEED, 0xFEEE, 0xFEED, 0xFEEE], // و
    0x0649: [0xFEEF, 0xFEF0, 0xFEEF, 0xFEF0], // ى
    0x064A: [0xFEF1, 0xFEF2, 0xFEF3, 0xFEF4], // ي
};

// Characters that only join to the right (don't connect to the next character)
const RIGHT_JOIN_ONLY = new Set([
    0x0622, 0x0623, 0x0624, 0x0625, 0x0627, 0x0629,
    0x062F, 0x0630, 0x0631, 0x0632, 0x0648, 0x0649, 0x0621,
]);

// Lam-Alef ligatures: when Lam (0x0644) is followed by an Alef variant
const LAM_ALEF: Record<number, [number, number]> = {
    0x0622: [0xFEF5, 0xFEF6], // لآ
    0x0623: [0xFEF7, 0xFEF8], // لأ
    0x0625: [0xFEF9, 0xFEFA], // لإ
    0x0627: [0xFEFB, 0xFEFC], // لا
};

function isArabicChar(code: number): boolean {
    return (code >= 0x0621 && code <= 0x064A) || code === 0x0640;
}

function isTashkeel(code: number): boolean {
    return code >= 0x064B && code <= 0x065F;
}

function canJoinNext(code: number): boolean {
    return isArabicChar(code) && !RIGHT_JOIN_ONLY.has(code);
}

function reshapeArabic(text: string): string {
    const chars: number[] = [];
    const codePoints = [...text].map(c => c.codePointAt(0)!);

    let i = 0;
    while (i < codePoints.length) {
        const code = codePoints[i];

        // Skip tashkeel for joining analysis but keep them
        if (isTashkeel(code)) {
            chars.push(code);
            i++;
            continue;
        }

        if (!isArabicChar(code) || !ARABIC_FORMS[code]) {
            chars.push(code);
            i++;
            continue;
        }

        // Check for Lam-Alef ligature
        if (code === 0x0644 && i + 1 < codePoints.length && LAM_ALEF[codePoints[i + 1]]) {
            const nextCode = codePoints[i + 1];
            // Check if lam has a previous joining character
            let prevJoins = false;
            for (let j = i - 1; j >= 0; j--) {
                if (isTashkeel(codePoints[j])) continue;
                prevJoins = isArabicChar(codePoints[j]) && canJoinNext(codePoints[j]);
                break;
            }
            chars.push(prevJoins ? LAM_ALEF[nextCode][1] : LAM_ALEF[nextCode][0]);
            i += 2;
            continue;
        }

        // Determine previous and next joining characters (skip tashkeel)
        let prevJoins = false;
        for (let j = i - 1; j >= 0; j--) {
            if (isTashkeel(codePoints[j])) continue;
            prevJoins = isArabicChar(codePoints[j]) && canJoinNext(codePoints[j]);
            break;
        }

        let nextJoins = false;
        for (let j = i + 1; j < codePoints.length; j++) {
            if (isTashkeel(codePoints[j])) continue;
            nextJoins = isArabicChar(codePoints[j]);
            break;
        }

        const forms = ARABIC_FORMS[code];
        if (prevJoins && nextJoins && canJoinNext(code)) {
            chars.push(forms[3]); // medial
        } else if (prevJoins) {
            chars.push(forms[1]); // final
        } else if (nextJoins && canJoinNext(code)) {
            chars.push(forms[2]); // initial
        } else {
            chars.push(forms[0]); // isolated
        }
        i++;
    }

    return String.fromCodePoint(...chars);
}

/**
 * Process text for RTL PDF rendering:
 * 1. Reshape Arabic characters to presentation forms
 * 2. Reverse the entire string for visual LTR rendering
 * 3. Re-reverse number sequences so they display correctly
 */
function processRTL(text: string): string {
    const reshaped = reshapeArabic(text);
    const reversed = [...reshaped].reverse().join('');
    // Re-reverse number sequences and Latin text
    return reversed
        .replace(/\d+([.,/\-]\d+)*/g, match => [...match].reverse().join(''))
        .replace(/[a-zA-Z][a-zA-Z0-9@._/:\-]*/g, match => [...match].reverse().join(''));
}

// ====== PDF Color Palette ======
const COLORS = {
    primaryBlue: rgb(0.10, 0.34, 0.86),
    darkBlue: rgb(0.05, 0.15, 0.40),
    headerBg: rgb(0.08, 0.20, 0.55),
    white: rgb(1, 1, 1),
    lightGray: rgb(0.95, 0.96, 0.97),
    medGray: rgb(0.7, 0.73, 0.76),
    darkText: rgb(0.12, 0.16, 0.20),
    success: rgb(0.02, 0.59, 0.41),
    warning: rgb(0.85, 0.65, 0.01),
    danger: rgb(0.86, 0.15, 0.15),
    gold: rgb(0.85, 0.65, 0.13),
    tableBorder: rgb(0.85, 0.87, 0.90),
    tableHeaderBg: rgb(0.10, 0.34, 0.86),
    tableAltBg: rgb(0.96, 0.97, 0.99),
};

// ====== PDF Generator ======
async function generateReportPDF(reportData: any, weekNum: number): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Fetch Arabic fonts
    console.log("Fetching Arabic fonts...");
    const [fontRes, fontBoldRes] = await Promise.all([
        fetch(FONT_URL),
        fetch(FONT_BOLD_URL),
    ]);
    const fontBytes = await fontRes.arrayBuffer();
    const fontBoldBytes = await fontBoldRes.arrayBuffer();
    const font = await pdfDoc.embedFont(fontBytes);
    const fontBold = await pdfDoc.embedFont(fontBoldBytes);
    console.log("Fonts embedded successfully.");

    const pageWidth = 595.28; // A4
    const pageHeight = 841.89;
    const margin = 40;
    const contentWidth = pageWidth - 2 * margin;

    // ===== PAGE 1 =====
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // --- Header Background ---
    page.drawRectangle({
        x: 0, y: pageHeight - 110,
        width: pageWidth, height: 110,
        color: COLORS.headerBg,
    });

    // --- Header: Academy Name ---
    const titleText = processRTL("أكاديمية النخبة الدولية للتدريب والتنمية");
    const titleWidth = fontBold.widthOfTextAtSize(titleText, 20);
    page.drawText(titleText, {
        x: (pageWidth - titleWidth) / 2,
        y: pageHeight - 50,
        size: 20,
        font: fontBold,
        color: COLORS.white,
    });

    // --- Header: Subtitle ---
    const subtitleText = processRTL("التقرير الأسبوعي لصناعة المحتوى");
    const subtitleWidth = font.widthOfTextAtSize(subtitleText, 14);
    page.drawText(subtitleText, {
        x: (pageWidth - subtitleWidth) / 2,
        y: pageHeight - 75,
        size: 14,
        font: font,
        color: rgb(0.8, 0.85, 1),
    });

    // --- Header: Week & Month Info ---
    const monthName = reportData.generalInfo?.monthName || '';
    const startDate = reportData.generalInfo?.startDate || '';
    const endDate = reportData.generalInfo?.endDate || '';
    const infoLine = processRTL(`الأسبوع ${weekNum}` + (monthName ? ` | شهر ${monthName}` : '') + (startDate && endDate ? ` | ${startDate} إلى ${endDate}` : ''));
    const infoWidth = font.widthOfTextAtSize(infoLine, 11);
    page.drawText(infoLine, {
        x: (pageWidth - infoWidth) / 2,
        y: pageHeight - 98,
        size: 11,
        font: font,
        color: rgb(0.85, 0.90, 1),
    });

    y = pageHeight - 130;

    // --- Overall Progress ---
    let totalTarget = 0;
    let totalAchieved = 0;
    const metrics = reportData.metricsData || [];
    metrics.forEach((m: any) => {
        totalTarget += m.target || 0;
        totalAchieved += Math.min(m.achieved || 0, m.target || 0);
    });
    const overallProgress = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;

    // Progress section
    const progressLabel = processRTL("معدل الإنجاز العام");
    const progressLabelW = fontBold.widthOfTextAtSize(progressLabel, 14);
    page.drawText(progressLabel, {
        x: pageWidth - margin - progressLabelW,
        y: y,
        size: 14,
        font: fontBold,
        color: COLORS.darkText,
    });

    const progressText = `${overallProgress}%`;
    page.drawText(progressText, {
        x: margin,
        y: y,
        size: 14,
        font: fontBold,
        color: overallProgress >= 100 ? COLORS.success : COLORS.primaryBlue,
    });

    y -= 20;

    // Progress bar background
    page.drawRectangle({
        x: margin, y: y,
        width: contentWidth, height: 14,
        color: COLORS.lightGray,
        borderColor: COLORS.tableBorder,
        borderWidth: 0.5,
    });

    // Progress bar fill
    const progressBarWidth = (overallProgress / 100) * contentWidth;
    if (progressBarWidth > 0) {
        page.drawRectangle({
            x: margin, y: y,
            width: Math.min(progressBarWidth, contentWidth), height: 14,
            color: overallProgress >= 100 ? COLORS.success : COLORS.primaryBlue,
        });
    }

    y -= 35;

    // --- Metrics Table ---
    const sectionTitle1 = processRTL("ملخص الأهداف والإنجازات");
    const sTitle1W = fontBold.widthOfTextAtSize(sectionTitle1, 14);
    page.drawText(sectionTitle1, {
        x: pageWidth - margin - sTitle1W,
        y: y,
        size: 14,
        font: fontBold,
        color: COLORS.darkBlue,
    });

    // Decorative line under title
    y -= 8;
    page.drawRectangle({
        x: pageWidth - margin - sTitle1W, y: y,
        width: sTitle1W, height: 2,
        color: COLORS.primaryBlue,
    });

    y -= 20;

    // Table header
    const colWidths = [80, 80, 80, 80, contentWidth - 320]; // %, remaining, achieved, target, name
    const colLabels = ["%", processRTL("المتبقي"), processRTL("المنجز"), processRTL("المستهدف"), processRTL("المقياس")];
    const tableRowH = 28;

    // Draw table header row
    page.drawRectangle({
        x: margin, y: y - tableRowH + 5,
        width: contentWidth, height: tableRowH,
        color: COLORS.tableHeaderBg,
    });

    let colX = margin;
    colLabels.forEach((label, idx) => {
        const w = colWidths[idx];
        const tw = fontBold.widthOfTextAtSize(label, 10);
        page.drawText(label, {
            x: colX + (w - tw) / 2,
            y: y - 15,
            size: 10,
            font: fontBold,
            color: COLORS.white,
        });
        colX += w;
    });

    y -= tableRowH;

    // Draw metric rows
    metrics.forEach((metric: any, index: number) => {
        const rowY = y - (index * tableRowH);
        const remaining = Math.max(0, (metric.target || 0) - (metric.achieved || 0));
        const percent = metric.target > 0 ? Math.min(100, Math.round(((metric.achieved || 0) / metric.target) * 100)) : 0;
        const rowBg = index % 2 === 0 ? COLORS.lightGray : COLORS.white;

        // Row background
        page.drawRectangle({
            x: margin, y: rowY - tableRowH + 5,
            width: contentWidth, height: tableRowH,
            color: rowBg,
        });

        // Row border
        page.drawLine({
            start: { x: margin, y: rowY - tableRowH + 5 },
            end: { x: margin + contentWidth, y: rowY - tableRowH + 5 },
            thickness: 0.5,
            color: COLORS.tableBorder,
        });

        const rowData = [
            `${percent}%`,
            `${remaining}`,
            `${metric.achieved || 0}`,
            `${metric.target || 0}`,
            processRTL(metric.title || ''),
        ];

        let cx = margin;
        rowData.forEach((cellText, cidx) => {
            const w = colWidths[cidx];
            const fontSize = cidx === 4 ? 10 : 11;
            const cellFont = cidx === 0 ? fontBold : font;
            const cellColor = cidx === 0
                ? (percent >= 100 ? COLORS.success : percent < 50 ? COLORS.danger : COLORS.darkText)
                : COLORS.darkText;

            const tw = cellFont.widthOfTextAtSize(cellText, fontSize);
            page.drawText(cellText, {
                x: cx + (w - tw) / 2,
                y: rowY - 15,
                size: fontSize,
                font: cellFont,
                color: cellColor,
            });
            cx += w;
        });
    });

    y -= (metrics.length * tableRowH) + 15;

    // Table bottom border
    page.drawLine({
        start: { x: margin, y: y + 10 },
        end: { x: margin + contentWidth, y: y + 10 },
        thickness: 1,
        color: COLORS.primaryBlue,
    });

    y -= 25;

    // ===== Helper: Draw a text section =====
    function drawSection(
        sectionPage: any,
        startY: number,
        title: string,
        content: string,
        accentColor: any
    ): [any, number] {
        let currentPage = sectionPage;
        let sy = startY;

        // Check if we need a new page
        if (sy < 120) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            sy = pageHeight - margin;
        }

        // Section accent bar
        currentPage.drawRectangle({
            x: pageWidth - margin - 4, y: sy - 2,
            width: 4, height: 20,
            color: accentColor,
        });

        // Section title
        const sTitle = processRTL(title);
        const sTitleW = fontBold.widthOfTextAtSize(sTitle, 13);
        currentPage.drawText(sTitle, {
            x: pageWidth - margin - 12 - sTitleW,
            y: sy,
            size: 13,
            font: fontBold,
            color: COLORS.darkText,
        });

        sy -= 22;

        // Section content
        if (!content || content.trim() === '') {
            const emptyText = processRTL("لم يُسجل بعد");
            const emptyW = font.widthOfTextAtSize(emptyText, 11);
            currentPage.drawText(emptyText, {
                x: pageWidth - margin - 15 - emptyW,
                y: sy,
                size: 11,
                font: font,
                color: COLORS.medGray,
            });
            sy -= 20;
        } else {
            const lines = content.split('\n');
            for (const line of lines) {
                if (sy < 60) {
                    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
                    sy = pageHeight - margin;
                }
                if (line.trim() === '') {
                    sy -= 10;
                    continue;
                }
                // Word wrap long lines
                const maxLineWidth = contentWidth - 30;
                const words = line.split(' ');
                let currentLine = '';

                for (const word of words) {
                    const testLine = currentLine ? currentLine + ' ' + word : word;
                    const testRTL = processRTL(testLine);
                    const testW = font.widthOfTextAtSize(testRTL, 11);
                    if (testW > maxLineWidth && currentLine) {
                        const rtlLine = processRTL(currentLine);
                        const rtlW = font.widthOfTextAtSize(rtlLine, 11);
                        currentPage.drawText(rtlLine, {
                            x: pageWidth - margin - 15 - rtlW,
                            y: sy,
                            size: 11,
                            font: font,
                            color: COLORS.darkText,
                        });
                        sy -= 18;
                        if (sy < 60) {
                            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
                            sy = pageHeight - margin;
                        }
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }
                if (currentLine) {
                    const rtlLine = processRTL(currentLine);
                    const rtlW = font.widthOfTextAtSize(rtlLine, 11);
                    currentPage.drawText(rtlLine, {
                        x: pageWidth - margin - 15 - rtlW,
                        y: sy,
                        size: 11,
                        font: font,
                        color: COLORS.darkText,
                    });
                    sy -= 18;
                }
            }
        }

        sy -= 10;
        return [currentPage, sy];
    }

    // --- Task Sections ---
    const sectionTitle2 = processRTL("تفاصيل حالة سير العمل");
    const sTitle2W = fontBold.widthOfTextAtSize(sectionTitle2, 14);
    if (y < 120) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
    }
    page.drawText(sectionTitle2, {
        x: pageWidth - margin - sTitle2W,
        y: y,
        size: 14,
        font: fontBold,
        color: COLORS.darkBlue,
    });
    y -= 8;
    page.drawRectangle({
        x: pageWidth - margin - sTitle2W, y: y,
        width: sTitle2W, height: 2,
        color: COLORS.primaryBlue,
    });
    y -= 25;

    [page, y] = drawSection(page, y, "✅ المهام المنجزة بالكامل", reportData.texts?.completedTasks || '', COLORS.success);
    [page, y] = drawSection(page, y, "⏳ مهام قيد التنفيذ حالياً", reportData.texts?.inProgressTasks || '', COLORS.warning);
    [page, y] = drawSection(page, y, "❌ مهام لم يتم إنجازها", reportData.texts?.uncompletedTasks || '', COLORS.danger);

    // Notes
    if (reportData.texts?.notes && reportData.texts.notes.trim()) {
        [page, y] = drawSection(page, y, "💡 ملاحظات ومقترحات", reportData.texts.notes, COLORS.gold);
    }

    // --- Links Section ---
    const links = reportData.links || [];
    if (links.length > 0) {
        if (y < 120) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
        }

        const linksTitle = processRTL("روابط الأعمال");
        const linksTitleW = fontBold.widthOfTextAtSize(linksTitle, 14);
        page.drawText(linksTitle, {
            x: pageWidth - margin - linksTitleW,
            y: y,
            size: 14,
            font: fontBold,
            color: COLORS.darkBlue,
        });
        y -= 8;
        page.drawRectangle({
            x: pageWidth - margin - linksTitleW, y: y,
            width: linksTitleW, height: 2,
            color: COLORS.primaryBlue,
        });
        y -= 22;

        for (const link of links) {
            if (y < 60) {
                page = pdfDoc.addPage([pageWidth, pageHeight]);
                y = pageHeight - margin;
            }
            const linkTitle = link.title || link.url || '';
            const linkUrl = link.url || '';
            if (linkTitle) {
                const lt = processRTL(linkTitle);
                const ltW = font.widthOfTextAtSize(lt, 11);
                page.drawText(lt, {
                    x: pageWidth - margin - 10 - ltW,
                    y: y,
                    size: 11,
                    font: fontBold,
                    color: COLORS.primaryBlue,
                });
                y -= 16;
            }
            if (linkUrl) {
                page.drawText(linkUrl, {
                    x: margin + 10,
                    y: y,
                    size: 9,
                    font: font,
                    color: COLORS.medGray,
                });
                y -= 18;
            }
        }
    }

    // --- Footer ---
    const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
    // Footer line
    lastPage.drawLine({
        start: { x: margin, y: 45 },
        end: { x: pageWidth - margin, y: 45 },
        thickness: 0.5,
        color: COLORS.tableBorder,
    });

    const footerText = processRTL("تم إعداد هذا التقرير بواسطة: مصطفى إبراهيم - Content Creator @ Elite Academy");
    const footerW = font.widthOfTextAtSize(footerText, 9);
    lastPage.drawText(footerText, {
        x: (pageWidth - footerW) / 2,
        y: 30,
        size: 9,
        font: font,
        color: COLORS.medGray,
    });

    const dateText = new Date().toLocaleDateString('en-GB');
    const dateW = font.widthOfTextAtSize(dateText, 8);
    lastPage.drawText(dateText, {
        x: (pageWidth - dateW) / 2,
        y: 18,
        size: 8,
        font: font,
        color: COLORS.medGray,
    });

    return pdfDoc.save();
}

// ====== Main Handler ======
serve(async (req) => {
    try {
        console.log("=== Weekly Report Function Started ===");

        // 1. Connect to database
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 2. Fetch current report
        const { data: currentReport, error: dbError } = await supabase
            .from('reports_current')
            .select('week_number, report_data')
            .eq('id', 1)
            .single();

        if (dbError || !currentReport) {
            console.error("No current report found", dbError);
            return new Response(JSON.stringify({ error: "No report found", details: dbError }), {
                headers: { "Content-Type": "application/json" },
                status: 404,
            });
        }

        const reportData = currentReport.report_data;
        const weekNum = currentReport.week_number || 0;
        console.log(`Report found: Week ${weekNum}`);

        // 3. Generate PDF
        console.log("Generating PDF...");
        const pdfBytes = await generateReportPDF(reportData, weekNum);
        console.log(`PDF generated: ${pdfBytes.length} bytes`);

        // 4. Upload to Supabase Storage
        const fileName = `weekly_report_week_${weekNum}.pdf`;
        console.log(`Uploading ${fileName} to Storage...`);

        const { error: uploadError } = await supabase.storage
            .from('reports-pdf')
            .upload(fileName, pdfBytes, {
                contentType: 'application/pdf',
                upsert: true,
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
            .from('reports-pdf')
            .getPublicUrl(fileName);

        const pdfPublicUrl = publicUrlData.publicUrl;
        console.log(`PDF uploaded. Public URL: ${pdfPublicUrl}`);

        // 5. Calculate progress for text message
        let totalTarget = 0;
        let totalAchieved = 0;
        if (reportData.metricsData) {
            reportData.metricsData.forEach((m: any) => {
                totalTarget += m.target || 0;
                totalAchieved += Math.min(m.achieved || 0, m.target || 0);
            });
        }
        const progress = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;

        // 6. Send PDF via WAWP
        console.log("Sending PDF via WAWP...");
        const sendPdfResponse = await fetch('https://wawp.net/wp-json/awp/v1/sendFile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instance_id: WAWP_INSTANCE_ID,
                access_token: WAWP_ACCESS_TOKEN,
                chatId: `${YOUR_WHATSAPP_NUMBER}@c.us`,
                file: {
                    url: pdfPublicUrl,
                    filename: fileName,
                    mimetype: 'application/pdf',
                },
                caption: `📊 التقرير الأسبوعي - الأسبوع ${weekNum} | الإنجاز: ${progress}%`,
            }),
        });
        const pdfResult = await sendPdfResponse.text();
        console.log("WAWP PDF Response:", pdfResult);

        // 7. Send complementary text message
        console.log("Sending text summary...");
        const textMessage = `
🌟 *ملخص التقرير الأسبوعي - أكاديمية النخبة* 🌟

📅 *الأسبوع رقم:* ${weekNum}
📊 *معدل الإنجاز العام:* ${progress}%

✅ *من أبرز المهام المنجزة:*
${reportData.texts?.completedTasks || 'لم يُسجل بعد'}

🔗 *لمشاهدة التقرير أونلاين:*
${WEBSITE_URL}

*تم الإرسال تلقائياً عبر نظام إدارة التقارير* 🤖
    `.trim();

        const sendTextResponse = await fetch('https://wawp.net/wp-json/awp/v1/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instance_id: WAWP_INSTANCE_ID,
                access_token: WAWP_ACCESS_TOKEN,
                chatId: `${YOUR_WHATSAPP_NUMBER}@c.us`,
                message: textMessage,
            }),
        });
        const textResult = await sendTextResponse.text();
        console.log("WAWP Text Response:", textResult);

        console.log("=== Weekly Report Function Completed ===");

        return new Response(JSON.stringify({
            success: true,
            message: "Report PDF generated and sent via WhatsApp",
            pdfUrl: pdfPublicUrl,
            wawpPdfResult: pdfResult,
            wawpTextResult: textResult,
        }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Function error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        });
    }
});
