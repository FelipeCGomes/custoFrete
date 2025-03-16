// Função para carregar os estados via API do IBGE
async function carregarEstados() {
    try {
        let response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
        let estados = await response.json();
        let estadoOrigemSelect = document.getElementById('estadoOrigem');
        let estadoDestinoSelect = document.getElementById('estadoDestino');
        estados.forEach(estado => {
            let optionOrigem = new Option(estado.nome, estado.sigla);
            let optionDestino = new Option(estado.nome, estado.sigla);
            estadoOrigemSelect.appendChild(optionOrigem);
            estadoDestinoSelect.appendChild(optionDestino);
        });
    } catch (error) {
        console.error("Erro ao carregar estados:", error);
    }
}

// Função para exibir notificações de alerta
function showNotification(message) {
    let notificationDiv = document.getElementById('notification');
    notificationDiv.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
    setTimeout(() => {
        notificationDiv.innerHTML = "";
    }, 3000);
}

// Função para converter string formatada para número (ex.: "1.234,56" -> 1234.56)
function parseMoney(value) {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.'));
}

// Função para converter string de porcentagem (ex.: "5,00%" -> 5)
function parsePercentage(value) {
    if (!value) return 0;
    return parseFloat(value.replace('%', '').replace(',', '.'));
}

// Função para converter o peso (ex.: "15.000" -> 15000)
function parseWeight(value) {
    if (!value) return 0;
    return parseFloat(value.replace('.', ''));
}

// Função para determinar o tipo de veículo com base no peso (em kg)
function determinarVeiculo(peso) {
    if (peso <= 1200) return "VUC";
    else if (peso <= 5000) return "3/4";
    else if (peso <= 8000) return "Toco";
    else if (peso <= 14000) return "Truck";
    else if (peso <= 18000) return "Bi-Truck";
    else return "Carreta";
}

// Tabela de alíquotas de ICMS conforme a atividade (baseado na regra do site Jornal Contábil)
const icmsRates = {
    "Transporte de Cargas": 0.07,
    "Transporte de Passageiros": 0.12,
    "Energia Elétrica": 0.18,
    "Combustíveis": 0.12,
    "Telecomunicações": 0.12,
    "Outros": 0.18
};

// Função para obter a cotação do diesel comum e diesel S10
async function getDieselPrices() {
    try {
        return {
            diesel_comum: 5.80,
            diesel_s10: 6.20
        };
    } catch (error) {
        console.error("Erro ao obter cotação do diesel:", error);
        return { diesel_comum: 0, diesel_s10: 0 };
    }
}

// Calcula os custos do frete e exibe os resultados com ícones
async function calcularFrete() {
    // Validação dos campos obrigatórios (agora incluindo 'atividade')
    const requiredFields = [
        { id: 'estadoOrigem', name: 'Estado de Origem' },
        { id: 'estadoDestino', name: 'Estado de Destino' },
        { id: 'valorNF', name: 'Valor da Nota Fiscal' },
        { id: 'pesoCTE', name: 'Peso do CTE' },
        { id: 'valorCTE', name: 'Valor do CTE' },
        { id: 'atividade', name: 'Atividade' }
    ];
    for (let field of requiredFields) {
        let element = document.getElementById(field.id);
        if (!element.value || element.value.trim() === "") {
            showNotification(`Por favor, preencha o campo "${field.name}".`);
            return;
        }
    }

    // Obtém os valores dos inputs
    let valorNF = parseMoney(document.getElementById('valorNF').value);
    let valorCTE = parseMoney(document.getElementById('valorCTE').value);
    let pesoCTE = parseWeight(document.getElementById('pesoCTE').value);
    let seguro = parsePercentage(document.getElementById('seguro').value);
    let descargaTonelada = parseMoney(document.getElementById('descargaTonelada').value);
    let descargaVeiculo = parseMoney(document.getElementById('descargaVeiculo').value);
    let estadoOrigem = document.getElementById('estadoOrigem').value;
    let estadoDestino = document.getElementById('estadoDestino').value;
    let atividade = document.getElementById('atividade').value;

    if (pesoCTE <= 0 || valorNF <= 0 || valorCTE <= 0) {
        showNotification("Por favor, insira valores numéricos válidos para os campos obrigatórios.");
        return;
    }

    // Obtém a alíquota de ICMS conforme a atividade selecionada
    let icmsRate = icmsRates[atividade] || 0.07;
    let icmsValor = valorCTE * icmsRate;

    // Cálculo dos demais custos
    let custoSeguro = valorNF * (seguro / 100);
    let pesoEmToneladas = pesoCTE / 1000;
    let custoDescargaTotal = (pesoEmToneladas * descargaTonelada) + descargaVeiculo;
    let custoTotal = valorCTE;
    let custoPercentualPorNF = (valorCTE / valorNF) * 100;
    let custoFretePorTonelada = valorCTE / pesoEmToneladas;
    let custoFretePorQuilo = valorCTE / pesoCTE;

    // Consulta de distância entre origem e destino usando API gratuita Distance24
    const capitalMapping = {
        "AC": "Rio Branco",
        "AL": "Maceió",
        "AP": "Macapá",
        "AM": "Manaus",
        "BA": "Salvador",
        "CE": "Fortaleza",
        "DF": "Brasília",
        "ES": "Vitória",
        "GO": "Goiânia",
        "MA": "São Luís",
        "MT": "Cuiabá",
        "MS": "Campo Grande",
        "MG": "Belo Horizonte",
        "PA": "Belém",
        "PB": "João Pessoa",
        "PR": "Curitiba",
        "PE": "Recife",
        "PI": "Teresina",
        "RJ": "Rio de Janeiro",
        "RN": "Natal",
        "RS": "Porto Alegre",
        "RO": "Porto Velho",
        "RR": "Boa Vista",
        "SC": "Florianópolis",
        "SP": "São Paulo",
        "SE": "Aracaju",
        "TO": "Palmas"
    };
    let originCapital = capitalMapping[estadoOrigem] || estadoOrigem;
    let destinationCapital = capitalMapping[estadoDestino] || estadoDestino;
    let distance = "";
    try {
        let url = "https://www.distance24.org/route.json?stops=" +
            encodeURIComponent(originCapital + ", Brazil") + "|" +
            encodeURIComponent(destinationCapital + ", Brazil");
        let response = await fetch(url);
        if (response.ok) {
            let data = await response.json();
            if (data && typeof data.distance !== 'undefined' && data.distance !== null) {
                distance = data.distance;
            }
        }
    } catch (e) {
        console.error("Erro ao obter a distância:", e);
    }

    let dieselPrices = await getDieselPrices();
    const formatBRL = (value) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Monta o HTML dos resultados com ícones
    let resultadoHTML = `
      <h3>Resultados do Cálculo:</h3>
      <div class="row">
        <div class="col-md-6">
          <p><i class="fa-solid fa-percent"></i> <strong>ICMS aplicado:</strong> ${(icmsRate * 100).toFixed(2)}%</p>
          <p><i class="fa-solid fa-money-bill-wave"></i> <strong>Valor do ICMS:</strong> ${formatBRL(icmsValor)}</p>
          <p><i class="fa-solid fa-shield"></i> <strong>Custo do Seguro:</strong> ${formatBRL(custoSeguro)}</p>
          <p><i class="fa-solid fa-truck-loading"></i> <strong>Custo de Descarga Total:</strong> ${formatBRL(custoDescargaTotal)}</p>
          <p><i class="fa-solid fa-calculator"></i> <strong>Custo Total:</strong> ${formatBRL(custoTotal)}</p>
          <p><i class="fa-solid fa-chart-pie"></i> <strong>Custo Percentual por NF:</strong> ${custoPercentualPorNF.toFixed(2)}%</p>
        </div>
        <div class="col-md-6">
          <p><i class="fa-solid fa-weight-scale"></i> <strong>Custo Frete por Tonelada:</strong> ${formatBRL(custoFretePorTonelada)}</p>
          <p><i class="fa-solid fa-weight-scale"></i> <strong>Custo Frete por Quilo:</strong> ${formatBRL(custoFretePorQuilo)}</p>
          ${distance ? `<p><i class="fa-solid fa-road"></i> <strong>Distância entre origem e destino:</strong> ${distance} km</p>` : ""}
          <p><i class="fa-solid fa-gas-pump"></i> <strong>Cotação Diesel Comum:</strong> ${formatBRL(dieselPrices.diesel_comum)}</p>
          <p><i class="fa-solid fa-gas-pump"></i> <strong>Cotação Diesel S10:</strong> ${formatBRL(dieselPrices.diesel_s10)}</p>
          <p><i class="fa-solid fa-truck"></i> <strong>Tipo de Veículo Sugerido:</strong> ${determinarVeiculo(pesoCTE)}</p>
        </div>
      </div>
      <div class="btn-container">
        <button type="button" class="btn btn-secondary" onclick="recalcular()">Recalcular</button>
      </div>
    `;

    document.getElementById('backCard').innerHTML = resultadoHTML;
    document.getElementById('cardContainer').classList.add('flipped');
}

function recalcular() {
    document.getElementById('freteForm').reset();
    document.getElementById('cardContainer').classList.remove('flipped');
}

$(document).ready(function () {
    $('.money').mask('000.000.000,00', { reverse: true });
    $('.weight').mask('00.000', { reverse: true });
    $('.percentage').mask('0,00%', { reverse: true });
    carregarEstados();
});
