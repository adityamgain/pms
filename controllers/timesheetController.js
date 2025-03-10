const ExcelJS = require("exceljs");
const moment = require("moment");

exports.generateTimesheet = async (req, res) => {
    // Get the selected month from request query, default to current month
    const selectedMonth = req.query.month ? parseInt(req.query.month) : moment().month() + 1;
    const currentYear = moment().year(); // Year is fixed to current year
    const month = selectedMonth;
    const year = currentYear;

    const workbook = new ExcelJS.Workbook();
    // Dynamically set sheet name with month name based on selected month
    const monthName = moment().month(month - 1).format('MMM'); // Get month name from month number
    const worksheet = workbook.addWorksheet(`${monthName} ${year} - Table 1-1`); // Sheet name now dynamic

    // Set default font and alignment for the entire sheet
    worksheet.properties.defaultRowHeight = 15;
    worksheet.eachRow((row) => {
        row.eachCell((cell) => {
            cell.font = { size: 11, name: 'Calibri' };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });
    });

    // Set column widths to match the original timesheet
    worksheet.columns = [
        { width: 5 },  // Column A
        { width: 10 }, // Column B
        { width: 10 }, // Column C
        { width: 13 }, // Column D
        { width: 5 },  // Column E
        { width: 10 }, // Column F
        { width: 10 }, // Column G
        { width: 5 },  // Column H
        { width: 24 }, // Column I
        { width: 10 }, // Column J
        { width: 10 }, // Column K
    ];

    // Add empty rows and headers
    worksheet.addRow([null, 'ANSAB', null, null, null, null, null, null, null, null, null]); // Row 1
    worksheet.addRow([]); // Row 2

    worksheet.mergeCells(`A1:I2`); // Merge cells A1 to K2
    worksheet.getCell('A1').value = 'ANSAB';
    worksheet.getCell('A1').font = { bold: true, size: 20 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow([null, 'MONTHLY TIME SHEET (ASF 1-01)', null, null, null, null, null, null, null, null, null]);
    worksheet.mergeCells(`A5:I5`); // Corrected merge range to A5:K5
    worksheet.getCell('A5').value = 'MONTHLY TIME SHEET (ASF 1-01)'; // **ENSURE THIS LINE IS PRESENT!**
    worksheet.getCell('A5').font = { bold: true, size: 14 }; // Apply font style to A5 (merged cell)
    worksheet.getCell('A5').alignment = { horizontal: 'center' }; 

    worksheet.addRow([]);

    // Merge A7, B7, and C7 for "Name:"
    worksheet.addRow(['Name:', null, null, null, 'Designation:', null, null, null, 'Month/Year:', null, null]);
    worksheet.mergeCells(`A7:C7`); // Merge cells A7 to C7 for "Name:"
    worksheet.mergeCells(`E7:H7`); // Merge cells E7 to H7 for "Designation:"
    worksheet.getCell('A7').font = { bold: true };
    worksheet.getCell('E7').font = { bold: true };
    worksheet.getCell('I7').font = { bold: true };

    // Set Month/Year value in I7
    worksheet.getCell('I7').value = `Month/Year: ${monthName}/${year}`;

    worksheet.addRow([]);

    worksheet.addRow(['DATE', 'DESCRIPTION OF WORK', null, null, null, null, null, null, 'PROJECT', null, null]);
    worksheet.mergeCells(`B9:H9`);
    worksheet.getCell('B9').font = { bold: true };
    worksheet.getCell('I9').font = { bold: true };
    worksheet.getRow(9).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const blackThinBorder = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
    };

    const greyFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'DDDDDD' }
    };

    const daysInMonth = new Date(year, month, 0).getDate();
    let currentRow = 10; // Start row for dates, initially row 10

    for (let day = 1; day <= daysInMonth; day++) {
        const date = moment([year, month - 1, day]);
        const dayOfWeek = date.day();
        const row = worksheet.addRow([day, null, null, null, null, null, null, null, null, null, null]);
        worksheet.mergeCells(`B${row.number}:H${row.number}`);

        // Conditionally add "Saturday" or "Sunday" based on dayOfWeek
        if (dayOfWeek === 6) { // Saturday (dayOfWeek 6)
            worksheet.getCell(`A${row.number}`).font = { bold: true };
            worksheet.getCell(`B${row.number}`).value = 'Saturday'; // Add "Saturday" only if it's actually Saturday
            worksheet.getCell(`B${row.number}`).font = { bold: true };
            worksheet.getCell(`B${row.number}`).alignment = { horizontal: 'center' };

            worksheet.getCell(`A${row.number}`).fill = greyFill;
            worksheet.getCell(`B${row.number}`).fill = greyFill;
            worksheet.getCell(`I${row.number}`).fill = greyFill;

            worksheet.getCell(`A${row.number}`).border = blackThinBorder;
            worksheet.getCell(`B${row.number}`).border = blackThinBorder;
            worksheet.getCell(`I${row.number}`).border = blackThinBorder;


        } else if (dayOfWeek === 0) { // Sunday (dayOfWeek 0)
            worksheet.getCell(`A${row.number}`).font = { bold: true };
            worksheet.getCell(`B${row.number}`).value = 'Sunday'; // Add "Sunday" only if it's actually Sunday
            worksheet.getCell(`B${row.number}`).font = { bold: true };
            worksheet.getCell(`B${row.number}`).alignment = { horizontal: 'center' };

            worksheet.getCell(`A${row.number}`).fill = greyFill;
            worksheet.getCell(`B${row.number}`).fill = greyFill;
            worksheet.getCell(`I${row.number}`).fill = greyFill;

            worksheet.getCell(`A${row.number}`).border = blackThinBorder;
            worksheet.getCell(`B${row.number}`).border = blackThinBorder;
            worksheet.getCell(`I${row.number}`).border = blackThinBorder;
        }
        // If dayOfWeek is not 6 or 0, then "DESCRIPTION OF WORK" remains empty (null) as initialized.
        currentRow++; // Increment currentRow after adding each date row
    }

    worksheet.addRow([]);
    worksheet.addRow([]);

    const summaryStartRow = currentRow + 2; // Calculate start row for summary section
    const projectRowNumber = summaryStartRow;
    const annualLeaveRowNumber = summaryStartRow + 1;
    const sickLeaveRowNumber = summaryStartRow + 2;
    const unpaidLeaveRowNumber = summaryStartRow + 3;
    const inLieuLeaveRowNumber = summaryStartRow + 4;
    const holidayTakenRowNumber = summaryStartRow + 5;
    const totalDaysRowNumber = summaryStartRow + 6;
    const signatureLineRowNumber = summaryStartRow + 11;
    const submittedByRowNumber = summaryStartRow + 12;
    const approvedByRowNumber = summaryStartRow + 13;


    worksheet.addRow(['PROJECT', null, null, 'DAYS WORKED', null, 'Total Days Worked', null, null, null, null, null]);
    worksheet.mergeCells(`A${projectRowNumber}:C${projectRowNumber}`);
    worksheet.mergeCells(`F${projectRowNumber}:H${projectRowNumber}`);
    worksheet.getCell('A' + projectRowNumber).font = { bold: true };
    worksheet.getCell('D' + projectRowNumber).font = { bold: true };
    worksheet.getCell('F' + projectRowNumber).font = { bold: true };

    const summaryRows = [
        [null, null, null, null, null, 'Annual Leave', null, null, null, null, null],
        [null, null, null, null, null, 'Sick Leave', null, null, null, null, null],
        [null, null, null, null, null, 'Unpaid Leave', null, null, null, null, null],
        [null, null, null, null, null, 'In-lieu Leave', null, null, null, null, null],
        [null, null, null, null, null, 'Holiday Taken', null, null, null, null, null],
        [null, null, null, null, null, 'Weekend Taken', null, null, null, null, null],
        ['TOTAL', null, null, null, null, 'TOTAL DAYS', null, null, `=SUM(I${annualLeaveRowNumber}:I${holidayTakenRowNumber})`, null, null], // Formula adjusted
    ];

    summaryRows.forEach((row, index) => {
        const addedRow = worksheet.addRow(row);
        worksheet.mergeCells(`A${addedRow.number}:C${addedRow.number}`);
        worksheet.mergeCells(`F${addedRow.number}:H${addedRow.number}`);
        if (index === 6) {
            addedRow.getCell('A').font = { bold: true };
            addedRow.getCell('F').font = { bold: true };
        }
        addedRow.getCell('I').font = { bold: true };
    });

    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow([]);

    worksheet.addRow(['…………………………', null, null, null, '………………………….', null, null, null,  '………………………….', null, null]);
    worksheet.mergeCells(`A${signatureLineRowNumber}:C${signatureLineRowNumber}`);
    worksheet.mergeCells(`E${signatureLineRowNumber}:G${signatureLineRowNumber}`);


    worksheet.addRow(['Submitted by', null, null, null,  'Checked by', '.....................' , null, null, 'Approved by', null, null]);
    worksheet.mergeCells(`A${submittedByRowNumber}:C${submittedByRowNumber}`);
    worksheet.mergeCells(`E${submittedByRowNumber}:G${submittedByRowNumber}`);


    worksheet.mergeCells(`A${approvedByRowNumber}:C${approvedByRowNumber}`);
    worksheet.mergeCells(`E${approvedByRowNumber}:G${approvedByRowNumber}`);


    worksheet.getCell('A' + submittedByRowNumber).font = { bold: true };
    worksheet.getCell('E' + submittedByRowNumber).font = { bold: true };
    worksheet.getCell('I' + submittedByRowNumber).font = { bold: true };
    worksheet.getRow(submittedByRowNumber).eachCell(cell => {
        cell.alignment = { horizontal: 'center', vertical: 'top' };
    });

    worksheet.getCell('A' + approvedByRowNumber).alignment = { horizontal: 'center', vertical: 'top' };
    worksheet.getCell('E' + approvedByRowNumber).alignment = { horizontal: 'center', vertical: 'top' };
    worksheet.getCell('I' + approvedByRowNumber).alignment = { horizontal: 'center', vertical: 'top' };

    // Set response headers with dynamic filename based on selected month
    const filenameMonth = moment().month(month - 1).format('MM'); // Get month number in MM format for filename
    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
        'Content-Disposition',
        `attachment; filename=timesheet-${filenameMonth}-${moment().format('YYYY')}.xlsx` // Filename with selected month and current year
    );

    // Write the workbook to the response
    await workbook.xlsx.write(res);
    res.end();
};