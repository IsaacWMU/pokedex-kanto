let indiceAtual = 1;

// Elementos da Pokédex
const elementoNumero = document.querySelector("#numero-pokemon");
const elementoNome = document.querySelector("#nome-pokemon");
const elementoTipo = document.querySelector("#tipo-pokemon");
const elementoAltura = document.querySelector("#altura-pokemon");
const elementoPeso = document.querySelector("#peso-pokemon");
const botaoAnterior = document.querySelector("#anterior");
const botaoProximo = document.querySelector("#proximo");
const campoPesquisa = document.querySelector("#campo-pesquisa");
const formularioPesquisa = document.querySelector("#form-pesquisa");
const mensagemPesquisa = document.querySelector("#mensagem-pesquisa");
const listaPokemon = document.querySelector("#lista-pokemon");
const statusLista = document.querySelector("#status-lista");
const filtroTipo = document.querySelector("#filtro-tipo");
const elementoImagem = document.querySelector("#imagem-pokemon");
const elementoDescricao = document.querySelector("#descricao-pokemon");
const elementoVantagens = document.querySelector("#vantagens-pokemon");
const elementoFraquezas = document.querySelector("#fraquezas-pokemon");

const cacheTipos = {};
let dadosTipos = null;

const traducaoTipos = {
    normal: "Normal",
    fire: "Fogo",
    water: "Água",
    electric: "Elétrico",
    grass: "Grama",
    ice: "Gelo",
    fighting: "Lutador",
    poison: "Veneno",
    ground: "Terra",
    flying: "Voador",
    psychic: "Psíquico",
    bug: "Inseto",
    rock: "Pedra",
    ghost: "Fantasma",
    dragon: "Dragão",
    dark: "Sombrio",
    steel: "Aço",
    fairy: "Fada"
};

function traduzirTipo(tipo) {
    return traducaoTipos[tipo] || tipo;
}

// Busca e guarda os dados dos tipos para reutilização.
async function carregarDadosTipos() {
    if (dadosTipos) {
        return dadosTipos;
    }

    const resposta = await fetch(
        "https://pokeapi.co/api/v2/type"
    );

    if (!resposta.ok) {
        throw new Error("Não foi possível carregar os tipos.");
    }

    const lista = await resposta.json();

    const tiposDisponiveis = lista.results.filter(tipo =>
        Object.prototype.hasOwnProperty.call(
            traducaoTipos,
            tipo.name
        )
    );

    const detalhes = await Promise.all(
        tiposDisponiveis.map(async tipo => {
            const respostaTipo = await fetch(tipo.url);

            if (!respostaTipo.ok) {
                throw new Error(
                    `Não foi possível carregar o tipo ${tipo.name}.`
                );
            }

            return respostaTipo.json();
        })
    );

    dadosTipos = Object.fromEntries(
        detalhes.map(tipo => [tipo.name, tipo])
    );

    return dadosTipos;
}

// Calcula quanto um tipo atacante causa contra um tipo defensor.
function multiplicadorContraTipo(
    tipoAtacante,
    tipoDefensor,
    tipos
) {
    const relacoes = tipos[tipoDefensor].damage_relations;

    if (
        relacoes.no_damage_from.some(
            item => item.name === tipoAtacante
        )
    ) {
        return 0;
    }

    if (
        relacoes.double_damage_from.some(
            item => item.name === tipoAtacante
        )
    ) {
        return 2;
    }

    if (
        relacoes.half_damage_from.some(
            item => item.name === tipoAtacante
        )
    ) {
        return 0.5;
    }

    return 1;
}

// Calcula vantagens ofensivas e fraquezas defensivas.
function calcularRelacoesTipos(tiposPokemon, tipos) {
    const todosOsTipos = Object.keys(tipos).filter(tipo =>
        !["unknown", "shadow"].includes(tipo)
    );

    const vantagens = [];
    const fraquezas = [];

    for (const tipoCandidato of todosOsTipos) {
        // Vantagem ofensiva:
        // verifica se algum tipo do Pokémon é super efetivo
        // contra o tipo candidato.
        let multiplicadorAtaque = 1;

        for (const tipoAtaque of tiposPokemon) {
            const relacoesAtaque =
                tipos[tipoAtaque].damage_relations;

            if (
                relacoesAtaque.double_damage_to.some(
                    item => item.name === tipoCandidato
                )
            ) {
                multiplicadorAtaque = Math.max(
                    multiplicadorAtaque,
                    2
                );
            }

            if (
                relacoesAtaque.half_damage_to.some(
                    item => item.name === tipoCandidato
                )
            ) {
                // Não reduz uma vantagem já encontrada
                // por outro tipo do Pokémon.
                if (multiplicadorAtaque === 1) {
                    multiplicadorAtaque = 0.5;
                }
            }
        }

        if (multiplicadorAtaque > 1) {
            vantagens.push(traduzirTipo(tipoCandidato));
        }

        // Fraqueza defensiva:
        // combina os multiplicadores contra cada tipo
        // defensivo do Pokémon.
        let multiplicadorDefesa = 1;

        for (const tipoDefensor of tiposPokemon) {
            multiplicadorDefesa *= multiplicadorContraTipo(
                tipoCandidato,
                tipoDefensor,
                tipos
            );
        }

        if (multiplicadorDefesa > 1) {
            fraquezas.push(traduzirTipo(tipoCandidato));
        }
    }

    return {
        vantagens,
        fraquezas
    };
}

// Mostra os dois espaços de tipos abaixo da imagem.
function exibirTipos(tiposPokemon) {
    elementoTipo.replaceChildren();

    for (let i = 0; i < 2; i++) {
        const slot = document.createElement("span");

        slot.classList.add("tipo-slot");

        if (tiposPokemon[i]) {
            const nomeTipo = tiposPokemon[i].type.name;

            slot.textContent = traduzirTipo(nomeTipo);
            slot.classList.add(`tipo-${nomeTipo}`);
        }

        elementoTipo.appendChild(slot);
    }
}

// Exibe cada vantagem ou fraqueza como uma etiqueta.
function exibirRelacoes(elemento, nomes, mensagemVazia) {
    if (!nomes.length) {
        elemento.textContent = mensagemVazia;
        return;
    }

    elemento.replaceChildren();

    nomes.forEach(nome => {
        const etiqueta = document.createElement("span");

        etiqueta.classList.add("etiqueta-tipo");
        etiqueta.textContent = nome;

        elemento.appendChild(etiqueta);
    });
}

// Carrega e exibe as vantagens e fraquezas.
async function exibirVantagensFraquezas(tiposPokemon) {
    elementoVantagens.textContent = "Calculando...";
    elementoFraquezas.textContent = "Calculando...";

    try {
        const tipos = await carregarDadosTipos();

        const nomesTipos = tiposPokemon.map(
            item => item.type.name
        );

        const relacoes = calcularRelacoesTipos(
            nomesTipos,
            tipos
        );

        exibirRelacoes(
            elementoVantagens,
            relacoes.vantagens,
            "Nenhuma vantagem de tipo identificada."
        );

        exibirRelacoes(
            elementoFraquezas,
            relacoes.fraquezas,
            "Nenhuma fraqueza de tipo identificada."
        );
    } catch (erro) {
        elementoVantagens.textContent =
            "Não foi possível carregar.";

        elementoFraquezas.textContent =
            "Não foi possível carregar.";

        console.error(
            "Erro ao calcular vantagens e fraquezas:",
            erro
        );
    }
}

// Busca os dados do Pokémon e atualiza a tela.
async function carregarPokemon(numero) {
    try {
        const resposta = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${numero}`
        );

        if (!resposta.ok) {
            throw new Error("Erro ao buscar Pokémon.");
        }

        const dados = await resposta.json();

        elementoNumero.textContent =
            `N° ${String(dados.id).padStart(3, "0")}`;

        elementoNome.textContent =
            dados.name.charAt(0).toUpperCase() +
            dados.name.slice(1);

        const imagem =
            dados.sprites.other?.["official-artwork"]?.front_default ||
            dados.sprites.front_default;

        elementoImagem.src = imagem || "";

        elementoImagem.alt = imagem
            ? `Imagem de ${elementoNome.textContent}`
            : "Imagem indisponível";

        exibirTipos(dados.types);

        elementoAltura.textContent =
            `Altura: ${dados.height / 10} m`;

        elementoPeso.textContent =
            `Peso: ${dados.weight / 10} kg`;

        await Promise.all([
            carregarDescricao(dados.id),
            exibirVantagensFraquezas(dados.types)
        ]);

        atualizarSelecaoLista(dados.id);
    } catch (erro) {
        mensagemPesquisa.textContent =
            "Não foi possível carregar o Pokémon. Verifique a conexão.";

        console.error("Erro ao carregar Pokémon:", erro);
    }
}

// Busca a descrição da espécie, priorizando português.
async function carregarDescricao(numero) {
    try {
        elementoDescricao.textContent =
            "Carregando descrição...";

        const resposta = await fetch(
            `https://pokeapi.co/api/v2/pokemon-species/${numero}`
        );

        if (!resposta.ok) {
            throw new Error(
                "Não foi possível carregar a descrição."
            );
        }

        const dados = await resposta.json();

        const entrada =
            dados.flavor_text_entries.find(
                item => item.language.name === "pt"
            ) ||
            dados.flavor_text_entries.find(
                item => item.language.name === "en"
            );

        elementoDescricao.textContent = entrada
            ? entrada.flavor_text
                .replace(/[\n\f\r]+/g, " ")
                .replace(/\s+/g, " ")
                .trim()
            : "Descrição não disponível.";
    } catch (erro) {
        elementoDescricao.textContent =
            "Não foi possível carregar a descrição.";

        console.error("Erro ao carregar descrição:", erro);
    }
}

// Pesquisa por nome ou número.
async function pesquisarPokemon() {
    const termo = campoPesquisa.value
        .trim()
        .toLowerCase();

    if (termo === "") {
        mensagemPesquisa.textContent =
            "Digite um nome ou número.";
        return;
    }

    if (!/^[a-z]+$/.test(termo) && !/^\d+$/.test(termo)) {
        mensagemPesquisa.textContent =
            "Digite um nome ou número válido.";
        return;
    }

    const numero = Number(termo);

    if (
        /^\d+$/.test(termo) &&
        (numero < 1 || numero > 151)
    ) {
        mensagemPesquisa.textContent =
            "Digite um número entre 1 e 151.";
        return;
    }

    try {
        mensagemPesquisa.textContent = "Pesquisando...";

        const resposta = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${termo}`
        );

        if (!resposta.ok) {
            throw new Error("Pokémon não encontrado.");
        }

        const dados = await resposta.json();

        if (dados.id > 151) {
            mensagemPesquisa.textContent =
                "Este Pokémon não pertence à Pokédex de Kanto.";
            return;
        }

        indiceAtual = dados.id;

        await carregarPokemon(indiceAtual);

        mensagemPesquisa.textContent = "";
    } catch (erro) {
        mensagemPesquisa.textContent =
            "Pokémon não encontrado ou falha de conexão.";

        console.error("Erro na pesquisa:", erro);
    }
}

// Carrega os 151 Pokémon de Kanto na lista.
async function carregarListaPokemon() {
    try {
        statusLista.textContent =
            "Carregando lista...";

        const resposta = await fetch(
            "https://pokeapi.co/api/v2/pokemon?limit=151&offset=0"
        );

        if (!resposta.ok) {
            throw new Error(
                "Não foi possível carregar a lista."
            );
        }

        const dados = await resposta.json();

        listaPokemon.replaceChildren();

        dados.results.forEach((pokemon, indice) => {
            const item = document.createElement("li");

            const numero = indice + 1;

            const nome =
                pokemon.name.charAt(0).toUpperCase() +
                pokemon.name.slice(1);

            item.textContent =
                `${String(numero).padStart(3, "0")} - ${nome}`;

            item.dataset.numero = numero;
            item.tabIndex = 0;
            item.setAttribute("role", "button");
            item.setAttribute("aria-label", `Selecionar ${nome}`);

            const selecionar = () => {
                indiceAtual = numero;
                carregarPokemon(indiceAtual);
            };

            item.addEventListener("click", selecionar);

            item.addEventListener("keydown", evento => {
                if (
                    evento.key === "Enter" ||
                    evento.key === " "
                ) {
                    evento.preventDefault();
                    selecionar();
                }
            });

            listaPokemon.appendChild(item);
        });

        statusLista.textContent =
            `${dados.results.length} Pokémon carregados.`;

        atualizarSelecaoLista(indiceAtual);
    } catch (erro) {
        statusLista.textContent =
            "Erro ao carregar a lista.";

        console.error("Erro na lista de Pokémon:", erro);
    }
}

// Filtra a lista pelo tipo selecionado.
async function filtrarListaPokemon() {
    const tipoSelecionado = filtroTipo.value;

    const itens = listaPokemon.querySelectorAll("li");

    if (tipoSelecionado === "todos") {
        itens.forEach(item => {
            item.hidden = false;
        });

        statusLista.textContent =
            `${itens.length} Pokémon carregados.`;

        return;
    }

    try {
        statusLista.textContent =
            "Filtrando Pokémon...";

        if (!cacheTipos[tipoSelecionado]) {
            const resposta = await fetch(
                `https://pokeapi.co/api/v2/type/${tipoSelecionado}`
            );

            if (!resposta.ok) {
                throw new Error(
                    "Não foi possível consultar o tipo."
                );
            }

            const dados = await resposta.json();

            cacheTipos[tipoSelecionado] = new Set(
                dados.pokemon
                    .map(item => {
                        const resultado =
                            item.pokemon.url.match(
                                /\/pokemon\/(\d+)\/?$/
                            );

                        return resultado
                            ? Number(resultado[1])
                            : null;
                    })
                    .filter(numero =>
                        numero !== null &&
                        numero >= 1 &&
                        numero <= 151
                    )
            );
        }

        const numerosDoTipo =
            cacheTipos[tipoSelecionado];

        let quantidadeEncontrada = 0;

        itens.forEach(item => {
            const corresponde = numerosDoTipo.has(
                Number(item.dataset.numero)
            );

            item.hidden = !corresponde;

            if (corresponde) {
                quantidadeEncontrada++;
            }
        });

        statusLista.textContent =
            `${quantidadeEncontrada} Pokémon encontrados.`;
    } catch (erro) {
        statusLista.textContent =
            "Erro ao filtrar Pokémon.";

        console.error("Erro ao filtrar Pokémon:", erro);
    }
}

// Destaca na lista o Pokémon atualmente selecionado.
function atualizarSelecaoLista(numero) {
    const itemAtual =
        listaPokemon.querySelector(".selecionado");

    if (itemAtual) {
        itemAtual.classList.remove("selecionado");
        itemAtual.removeAttribute("aria-current");
    }

    const novoItem = listaPokemon.querySelector(
        `[data-numero="${numero}"]`
    );

    if (novoItem) {
        novoItem.classList.add("selecionado");
        novoItem.setAttribute("aria-current", "true");

        if (novoItem.hidden) {
            filtroTipo.value = "todos";

            listaPokemon.querySelectorAll("li").forEach(item => {
                item.hidden = false;
            });
        }
    }
}

// Botão de Pokémon anterior.
botaoAnterior.addEventListener("click", () => {
    if (indiceAtual > 1) {
        indiceAtual--;
        carregarPokemon(indiceAtual);
    }
});

// Botão de próximo Pokémon.
botaoProximo.addEventListener("click", () => {
    if (indiceAtual < 151) {
        indiceAtual++;
        carregarPokemon(indiceAtual);
    }
});

// Pesquisa pelo botão ou pela tecla Enter.
formularioPesquisa.addEventListener("submit", evento => {
    evento.preventDefault();
    pesquisarPokemon();
});

// Filtro por tipo.
filtroTipo.addEventListener(
    "change",
    filtrarListaPokemon
);

// Inicialização da Pokédex.
carregarPokemon(indiceAtual);
carregarListaPokemon();