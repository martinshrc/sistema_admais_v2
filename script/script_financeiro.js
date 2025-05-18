async function loadFinanceChart() {
    const sheetId = '1pTZwzWasNz22LBLft6puozipSj761mHQI3TBBoIJQik';
    const entradasUrl = `https://opensheet.vercel.app/${sheetId}/Entradas`;
    const saidasUrl = `https://opensheet.vercel.app/${sheetId}/Saídas`;

    const agruparPorMes = (dados) => {
        const resultado = {};
        dados.forEach(row => {
            const dataBr = row.Data?.trim();
            const valorTexto = row.Valor?.replace('R$', '').replace(/\s/g, '').replace(',', '.');
            const valor = parseFloat(valorTexto) || 0;

            if (!dataBr || isNaN(valor)) return;
            const [dia, mes, ano] = dataBr.split('/');
            if (!dia || !mes || !ano) return;
            const chave = `${mes}/${ano}`; // exemplo: 04/2025
            resultado[chave] = (resultado[chave] || 0) + valor;
        });
        return resultado;
    };

    try {
        const [entradasResp, saidasResp] = await Promise.all([
            fetch(entradasUrl),
            fetch(saidasUrl)
        ]);

        const entradasData = await entradasResp.json();
        const saidasData = await saidasResp.json();

        const entradasPorMes = agruparPorMes(entradasData);
        const saidasPorMes = agruparPorMes(saidasData);

        const meses = Array.from(new Set([
            ...Object.keys(entradasPorMes),
            ...Object.keys(saidasPorMes)
        ])).sort((a, b) => {
            const [ma, aa] = a.split('/').map(Number);
            const [mb, ab] = b.split('/').map(Number);
            return aa !== ab ? aa - ab : ma - mb;
        });

        const entradasValores = meses.map(m => entradasPorMes[m] || 0);
        const saidasValores = meses.map(m => saidasPorMes[m] || 0);

        const ctx = document.getElementById('financeChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: meses.map(m => `Mês ${m}`),
                datasets: [
                    {
                        label: 'Entradas',
                        data: entradasValores,
                        backgroundColor: '#10B981'
                    },
                    {
                        label: 'Saídas',
                        data: saidasValores,
                        backgroundColor: '#EF4444'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'R$'
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Erro ao carregar ou processar os dados:', error);
    }


}

document.addEventListener('DOMContentLoaded', loadFinanceChart);

// URLs das planilhas
const sheetId = '1pTZwzWasNz22LBLft6puozipSj761mHQI3TBBoIJQik';
const entradasUrl = `https://opensheet.vercel.app/${sheetId}/Entradas`;
const saidasUrl = `https://opensheet.vercel.app/${sheetId}/Saídas`;

// Função para formatar os dados das transações
function formatTransactionRow(data) {
    return `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${data.Data}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${data.Descrição}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${data.Categoria}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${data.Tipo}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${data.Valor}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${data.Status}</td>
        </tr>
    `;
}

// Função para buscar dados da planilha e preencher a tabela
async function fetchTransactions() {
    const entradasResponse = await fetch(entradasUrl);
    const entradasData = await entradasResponse.json();

    const saidasResponse = await fetch(saidasUrl);
    const saidasData = await saidasResponse.json();

    const transactions = [...entradasData, ...saidasData];

    // Preencher a tabela com os dados
    const tableBody = document.getElementById('transactionsTableBody');
    tableBody.innerHTML = ''; // Limpar a animação de carregamento

    transactions.forEach(transaction => {
        tableBody.innerHTML += formatTransactionRow(transaction);
    });
}

// Função KPI cards
const parseCurrency = (value) => {
    if (!value) return 0;
    return parseFloat(value.replace('R$', '').replace('.', '').replace(',', '.')) || 0;
};
// Mostrando valor trimestral KPI cards
const getLast3MonthsData = (data) => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3); // rever essa parte, colocar pra mudar junto com filtro ou colocar somente mes atual

    return data.filter(item => {
        const itemDate = new Date(item.Data);
        return itemDate >= threeMonthsAgo;
    });
};
// KPIs
async function loadKPIs() {
    const [entradasRes, saidasRes] = await Promise.all([
        fetch(entradasUrl),
        fetch(saidasUrl)
    ]);

    const [entradas, saidas] = await Promise.all([
        entradasRes.json(),
        saidasRes.json()
    ]);

    const entradasRecentes = getLast3MonthsData(entradas);
    const saidasRecentes = getLast3MonthsData(saidas);

    const totalEntradas = entradasRecentes.reduce((sum, item) => sum + parseCurrency(item.Valor), 0);
    const totalSaidas = saidasRecentes.reduce((sum, item) => sum + parseCurrency(item.Valor), 0);
    const lucroLiquido = totalEntradas - totalSaidas;
    const margemLucro = totalEntradas > 0 ? (lucroLiquido / totalEntradas) * 100 : 0;

    // Função para formatar número como moeda brasileira
    const formatBRL = (value) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Atualizar os cards no HTML com formatação BRL
    document.getElementById('totalRevenue').textContent = formatBRL(totalEntradas);
    document.getElementById('totalExpenses').textContent = formatBRL(totalSaidas);
    document.getElementById('netProfit').textContent = formatBRL(lucroLiquido);
    document.getElementById('profitMargin').textContent = `${margemLucro.toFixed(2).replace('.', ',')}%`;

}

loadKPIs();
// Chamar a função para buscar e renderizar as transações ao carregar a página
window.onload = fetchTransactions;