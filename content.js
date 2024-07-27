// יש לוודא שהקובץ הזה נטען אחרי שה-DOM נטען במלואו
document.addEventListener('DOMContentLoaded', function () {
    setupFormattedInputs();
});

let componentCount = 1;

function formatNumber(num) {
    return new Intl.NumberFormat('he-IL').format(num);
}

function parseFormattedNumber(str) {
    return parseFloat(str.replace(/,/g, ''));
}

function addMortgageComponent() {
    componentCount++;
    const newComponent = document.createElement('div');
    newComponent.className = 'mortgage-component fade-in';
    newComponent.innerHTML = `
        <h3>רכיב משכנתא ${componentCount}</h3>
        <div class="form-group">
            <label for="amount${componentCount}">סכום:</label>
            <input type="text" id="amount${componentCount}" required>
        </div>
        <div class="form-group">
            <label for="interestType${componentCount}">סוג ריבית:</label>
            <select id="interestType${componentCount}">
                <option value="fixed">קבועה</option>
                <option value="variable">משתנה כל 5 שנים</option>
                <option value="prime">פריים</option>
                <option value="other">אחר</option>
            </select>
        </div>
        <div class="form-group">
            <label for="interestRate${componentCount}">שיעור ריבית שנתי (%):</label>
            <input type="text" id="interestRate${componentCount}" step="0.01" required>
        </div>
        <div class="form-group">
            <label for="period${componentCount}">תקופה:</label>
            <select id="period${componentCount}">
                <option value="20">20 שנה</option>
                <option value="25">25 שנה</option>
                <option value="30">30 שנה</option>
            </select>
        </div>
    `;
    document.getElementById('mortgageComponents').appendChild(newComponent);
    setupFormattedInputs();
}

function setupFormattedInputs() {
    const inputs = document.querySelectorAll('input[type="text"]');
    inputs.forEach(input => {
        input.addEventListener('input', function (e) {
            let value = e.target.value.replace(/,/g, '');
            if (!isNaN(value) && value.length > 0) {
                e.target.value = formatNumber(parseFloat(value));
            }
        });
    });
}

function calculate() {
    const propertyPrice = parseFormattedNumber(document.getElementById('propertyPrice').value);
    const downPayment = parseFormattedNumber(document.getElementById('downPayment').value);
    const appreciation = parseFormattedNumber(document.getElementById('propertyAppreciation').value) / 100;
    const inflation = parseFormattedNumber(document.getElementById('inflation').value) / 100;
    const constructionIndex = parseFormattedNumber(document.getElementById('constructionIndex').value) / 100;
    const constructionYears = parseFormattedNumber(document.getElementById('constructionYears').value);
    const purchaseTax = parseFormattedNumber(document.getElementById('purchaseTax').value) / 100;
    const saleYear = parseFormattedNumber(document.getElementById('saleYear').value);
    const capitalGainsTax = parseFormattedNumber(document.getElementById('capitalGainsTax').value) / 100;

    let totalLoan = 0;
    let totalMonthlyPayment = 0;
    let maxPeriod = 0;
    let mortgageComponents = [];

    for (let i = 1; i <= componentCount; i++) {
        const amount = parseFormattedNumber(document.getElementById(`amount${i}`).value);
        const interestRate = parseFormattedNumber(document.getElementById(`interestRate${i}`).value) / 100;
        const period = parseInt(document.getElementById(`period${i}`).value);

        totalLoan += amount;
        const monthlyRate = interestRate / 12;
        const months = period * 12;
        const monthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
        totalMonthlyPayment += monthlyPayment;

        if (period > maxPeriod) maxPeriod = period;

        mortgageComponents.push({ amount, interestRate, period, monthlyPayment });
    }

    const mortgageAmount = propertyPrice - downPayment;
    const constructionCostIncrease = (mortgageAmount * 0.5) * (Math.pow(1 + constructionIndex, constructionYears) - 1);
    const purchaseTaxAmount = propertyPrice * purchaseTax;

    let results = '';

    if (saleYear && saleYear <= maxPeriod) {
        // Early sale scenario
        const monthsUntilSale = saleYear * 12;
        let totalPaidUntilSale = 0;
        let remainingDebt = 0;
        let totalInterestPaid = 0;

        mortgageComponents.forEach(component => {
            const monthlyRate = component.interestRate / 12;
            const totalMonths = Math.min(monthsUntilSale, component.period * 12);
            const paidUntilSale = component.monthlyPayment * totalMonths;
            totalPaidUntilSale += paidUntilSale;

            const remainingPrincipal = component.amount * Math.pow(1 + monthlyRate, totalMonths) -
                (component.monthlyPayment / monthlyRate) * (Math.pow(1 + monthlyRate, totalMonths) - 1);
            remainingDebt += Math.max(0, remainingPrincipal);

            totalInterestPaid += paidUntilSale - (component.amount - Math.max(0, remainingPrincipal));
        });

        const propertyValueAtSale = propertyPrice * Math.pow(1 + appreciation, saleYear);
        const realPropertyValueAtSale = propertyValueAtSale / Math.pow(1 + inflation, saleYear);
        const realTotalPaidUntilSale = totalPaidUntilSale / Math.pow(1 + inflation, saleYear);

        const grossProfit = propertyValueAtSale - propertyPrice - purchaseTaxAmount - totalInterestPaid + constructionCostIncrease;
        const capitalGainsTaxAmount = Math.max(0, grossProfit * capitalGainsTax);
        const netProfit = grossProfit - capitalGainsTaxAmount;
        results = `
            <h2>תוצאות למכירה בשנה ${saleYear}:</h2>
            <p>סכום ששולם עד למכירה: ${formatNumber(totalPaidUntilSale.toFixed(2))} ₪</p>
            <p>יתרת חוב במשכנתא: ${formatNumber(remainingDebt.toFixed(2))} ₪</p>
            <p>תשלום חודשי: ${formatNumber(totalMonthlyPayment.toFixed(2))} ₪</p>
            <p>סך הריבית ששולמה: ${formatNumber(totalInterestPaid.toFixed(2))} ₪</p>
            <p>ערך הדירה בזמן המכירה: ${formatNumber(propertyValueAtSale.toFixed(2))} ₪</p>
            <p>ערך ריאלי של הדירה בזמן המכירה: ${formatNumber(realPropertyValueAtSale.toFixed(2))} ₪</p>
            <p>סך תשלומים ריאליים עד למכירה: ${formatNumber(realTotalPaidUntilSale.toFixed(2))} ₪</p>
            <p>עלייה בעלות הבנייה: ${formatNumber(constructionCostIncrease.toFixed(2))} ₪</p>
            <p>מס רכישה: ${formatNumber(purchaseTaxAmount.toFixed(2))} ₪</p>
            <p>רווח גולמי: ${formatNumber(grossProfit.toFixed(2))} ₪</p>
            <p>מס שבח: ${formatNumber(capitalGainsTaxAmount.toFixed(2))} ₪</p>
            <p>רווח נטו משוער (אחרי מס שבח): ${formatNumber(netProfit.toFixed(2))} ₪</p>
        `;
    } else {
        // Full term scenario
        const futureValue = propertyPrice * Math.pow(1 + appreciation, maxPeriod);
        const totalPayments = totalMonthlyPayment * maxPeriod * 12;
        const totalInterest = totalPayments - totalLoan;

        const realFutureValue = futureValue / Math.pow(1 + inflation, maxPeriod);
        const realTotalPayments = totalPayments / Math.pow(1 + inflation, maxPeriod);

        const grossProfit = futureValue - propertyPrice - purchaseTaxAmount - totalInterest + constructionCostIncrease;
        const capitalGainsTaxAmount = Math.max(0, grossProfit * capitalGainsTax);
        const netProfit = grossProfit - capitalGainsTaxAmount - purchaseTaxAmount;

        results = `
            <h2>תוצאות לתקופה מלאה:</h2>
            <p>סך הכל הלוואה: ${formatNumber(totalLoan.toFixed(2))} ₪</p>
            <p>תשלום חודשי: ${formatNumber(totalMonthlyPayment.toFixed(2))} ₪</p>
            <p>ערך עתידי משוער של הנכס: ${formatNumber(futureValue.toFixed(2))} ₪</p>
            <p>ערך עתידי ריאלי של הנכס (מתואם לאינפלציה): ${formatNumber(realFutureValue.toFixed(2))} ₪</p>
            <p>סך הכל תשלומים: ${formatNumber(totalPayments.toFixed(2))} ₪</p>
            <p>סך הכל תשלומים ריאליים (מתואמים לאינפלציה): ${formatNumber(realTotalPayments.toFixed(2))} ₪</p>
            <p>סך הכל ריבית: ${formatNumber(totalInterest.toFixed(2))} ₪</p>
            <p>עלייה בעלות הבנייה: ${formatNumber(constructionCostIncrease.toFixed(2))} ₪</p>
            <p>מס רכישה: ${formatNumber(purchaseTaxAmount.toFixed(2))} ₪</p>
            <p>רווח גולמי משוער: ${formatNumber(grossProfit.toFixed(2))} ₪</p>
            <p>מס שבח: ${formatNumber(capitalGainsTaxAmount.toFixed(2))} ₪</p>
            <p>רווח נטו משוער (אחרי מס שבח): ${formatNumber(netProfit.toFixed(2))} ₪</p>
            `;
    }
    const resultsElement = document.getElementById('results');
    resultsElement.innerHTML = results;
    resultsElement.classList.add('show');
    document.getElementById('downloadPDF').disabled = false;
}

// חשוב לייצא את הפונקציות שנקראות מה-HTML
window.addMortgageComponent = addMortgageComponent;
window.calculate = calculate;

function prepareResults(results) {
    // המרת התוצאות לטבלה עם סגנון פשוט
    const rows = results.split('\n').map(row => {
        const [key, value] = row.split(':').map(item => item.trim());
        return `<tr><td style="padding: 5px; border: 1px solid #ddd;">${key}</td><td style="padding: 5px; border: 1px solid #ddd;">${value || ''}</td></tr>`;
    }).join('');

    return `<table style="width: 100%; border-collapse: collapse;">${rows}</table>`;
}

function captureAndDownload() {
    // ביטול אנימציות
    document.body.classList.add('no-animations');

    setTimeout(() => {
        const element = document.querySelector('.container');
        
        html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'mortgage_calculation_results.png';
            link.href = canvas.toDataURL('image/png');
            link.click();

            // החזרת אנימציות
            document.body.classList.remove('no-animations');
        });
    }, 500);
}

window.captureAndDownload = captureAndDownload;
