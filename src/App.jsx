import React, { useEffect, useMemo, useState } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbws07uXsdHGeEz3pikogSv0PoDo4H-HeVWen2FVNU7nUJOJLEu4Klz5ZiDkH6YzFNvC/exec";

const colaboradoresIniciais = [
  { id: "adriano", nome: "Adriano Lima da Silva", status: "Ativo", pin: "3456" },
  { id: "railson", nome: "Railson Deivison Soares Barbosa", status: "Ativo", pin: "1234" },
  { id: "theylo", nome: "Theylo Pereira Magalhães", status: "Ativo", pin: "2345" },
];

const tiposRegistro = [
  { key: "entrada", label: "Entrada", padrao: "07:00" },
  { key: "saidaAlmoco", label: "Saída Almoço", padrao: "11:00" },
  { key: "retornoAlmoco", label: "Retorno Almoço", padrao: "13:00" },
  { key: "saida", label: "Saída", padrao: "18:00" },
];

function formatarDataHora(date = new Date()) {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function dataLocalISO(date = new Date()) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function normalizarDataISO(valor) {
  if (!valor) return "";

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return dataLocalISO(valor);
  }

  const texto = String(valor).trim();

  const matchISO = texto.match(/\d{4}-\d{2}-\d{2}/);
  if (matchISO) return matchISO[0];

  const matchBR = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (matchBR) {
    return `${matchBR[3]}-${matchBR[2]}-${matchBR[1]}`;
  }

  const dataConvertida = new Date(texto);
  if (!Number.isNaN(dataConvertida.getTime())) {
    return dataLocalISO(dataConvertida);
  }

  return texto;
}

function hojeISO() {
  return dataLocalISO(new Date());
}

function ontemISO() {
  const data = new Date();
  data.setDate(data.getDate() - 1);
  return dataLocalISO(data);
}

function mesAtualISO() {
  return hojeISO().slice(0, 7);
}

function minuto(hora) {
  if (!hora) return null;
  const texto = String(hora).trim();
  const match = texto.match(/(\d{1,2}):(\d{2})/);

  if (!match) return null;

  const h = Number(match[1]);
  const m = Number(match[2]);

  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  return h * 60 + m;
}

function minutosTexto(total) {
  const seguro = Math.max(0, Number(total) || 0);
  const h = Math.floor(seguro / 60);
  const m = seguro % 60;
  return `${h}h${String(m).padStart(2, "0")}min`;
}

function horaInput(valor) {
  if (!valor) return "";

  const texto = String(valor).trim();
  const match = texto.match(/(\d{2}:\d{2})/);

  return match ? match[1] : "";
}

function formatarHoraPlanilha(valor) {
  if (!valor) return "";

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  const texto = String(valor).trim();

  const matchHora = texto.match(/(\d{1,2}):(\d{2})/);
  if (matchHora) {
    return `${String(matchHora[1]).padStart(2, "0")}:${matchHora[2]}`;
  }

  const dataConvertida = new Date(texto);
  if (!Number.isNaN(dataConvertida.getTime())) {
    return dataConvertida.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return texto;
}

function horaParaMinutosSaldo(valor) {
  if (!valor) return 0;

  const texto = String(valor).trim().replace("+", "").replace("-", "");
  const matchHora = texto.match(/(\d{1,3}):(\d{2})/);
  const matchTexto = texto.match(/(\d+)h(\d{2})min/);

  if (matchHora) {
    return (Number(matchHora[1]) || 0) * 60 + (Number(matchHora[2]) || 0);
  }

  if (matchTexto) {
    return (Number(matchTexto[1]) || 0) * 60 + (Number(matchTexto[2]) || 0);
  }

  return 0;
}

function saldoFinalParaMinutos(valor) {
  if (!valor) return 0;

  const texto = String(valor).trim();
  const minutos = horaParaMinutosSaldo(texto);

  if (texto.startsWith("-")) return -minutos;

  return minutos;
}

function calcularExtraDia(ponto) {
  if (ponto?.extras) {
    return horaParaMinutosSaldo(ponto.extras);
  }

  let extra = 0;

  const entrada = minuto(ponto.entrada);
  const saidaAlmoco = minuto(ponto.saidaAlmoco);
  const retornoAlmoco = minuto(ponto.retornoAlmoco);
  const saida = minuto(ponto.saida);

  const pEntrada = minuto("07:00");
  const pSaidaAlmoco = minuto("11:00");
  const pRetornoAlmoco = minuto("13:00");
  const pSaida = minuto("18:00");

  if (entrada !== null && entrada < pEntrada) extra += pEntrada - entrada;
  if (saidaAlmoco !== null && saidaAlmoco > pSaidaAlmoco) extra += saidaAlmoco - pSaidaAlmoco;
  if (retornoAlmoco !== null && retornoAlmoco < pRetornoAlmoco) extra += pRetornoAlmoco - retornoAlmoco;
  if (saida !== null && saida > pSaida) extra += saida - pSaida;

  return extra;
}

function calcularSaldoDevedorDia(ponto) {
  if (ponto?.devedor) {
    return horaParaMinutosSaldo(ponto.devedor);
  }

  let devedor = 0;

  const entrada = minuto(ponto.entrada);
  const saidaAlmoco = minuto(ponto.saidaAlmoco);
  const retornoAlmoco = minuto(ponto.retornoAlmoco);
  const saida = minuto(ponto.saida);

  const pEntrada = minuto("07:00");
  const pSaidaAlmoco = minuto("11:00");
  const pRetornoAlmoco = minuto("13:00");
  const pSaida = minuto("18:00");

  if (entrada !== null && entrada > pEntrada) devedor += entrada - pEntrada;
  if (saidaAlmoco !== null && saidaAlmoco < pSaidaAlmoco) devedor += pSaidaAlmoco - saidaAlmoco;
  if (retornoAlmoco !== null && retornoAlmoco > pRetornoAlmoco) devedor += retornoAlmoco - pRetornoAlmoco;
  if (saida !== null && saida < pSaida) devedor += pSaida - saida;

  return devedor;
}

function normalizarPonto(ponto) {
  const extras = ponto.extras || "00:00";
  const devedor = ponto.devedor || "00:00";
  const saldoFinal = ponto.saldoFinal || ponto.saldo || "";

  return {
    ...ponto,
    data: normalizarDataISO(ponto.data),
    entrada: formatarHoraPlanilha(ponto.entrada),
    saidaAlmoco: formatarHoraPlanilha(ponto.saidaAlmoco),
    retornoAlmoco: formatarHoraPlanilha(ponto.retornoAlmoco),
    saida: formatarHoraPlanilha(ponto.saida),
    extras,
    devedor,
    saldoFinal: saldoFinal || (
      horaParaMinutosSaldo(extras) > horaParaMinutosSaldo(devedor)
        ? `+${minutosParaHora(horaParaMinutosSaldo(extras) - horaParaMinutosSaldo(devedor))}`
        : horaParaMinutosSaldo(devedor) > horaParaMinutosSaldo(extras)
          ? `-${minutosParaHora(horaParaMinutosSaldo(devedor) - horaParaMinutosSaldo(extras))}`
          : "00:00"
    ),
    justificativa: ponto.justificativa || "",
    statusJustificativa: ponto.statusJustificativa || "",
  };
}

function minutosParaHora(totalMinutos) {
  const seguro = Math.max(0, Number(totalMinutos) || 0);
  const horas = Math.floor(seguro / 60);
  const minutos = seguro % 60;

  return String(horas).padStart(2, "0") + ":" + String(minutos).padStart(2, "0");
}

function formatarSaldoFinal(minutos) {
  if (minutos > 0) return `+${minutosTexto(minutos)}`;
  if (minutos < 0) return `-${minutosTexto(Math.abs(minutos))}`;
  return "0h00min";
}

export default function App() {
  const [modo, setModo] = useState("funcionario");
  const [adminLogado, setAdminLogado] = useState(false);
  const [senhaAdmin, setSenhaAdmin] = useState("admin123");
  const [modalAdminAberto, setModalAdminAberto] = useState(false);
  const [senhaAdminDigitada, setSenhaAdminDigitada] = useState("");

  const [colaboradorId, setColaboradorId] = useState("railson");
  const [pinFuncionario, setPinFuncionario] = useState("");
  const [mostrarTecladoPin, setMostrarTecladoPin] = useState(false);
  const [funcionarioLogado, setFuncionarioLogado] = useState(null);
  const [modalJustificativaAberto, setModalJustificativaAberto] = useState(false);
  const [textoJustificativa, setTextoJustificativa] = useState("");

  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  const [colaboradores, setColaboradores] = useState(colaboradoresIniciais);
  const [novoFuncionario, setNovoFuncionario] = useState({
    id: "",
    nome: "",
    status: "Ativo",
    pin: "",
  });

  const [pontos, setPontos] = useState([]);
  const [filtroRelatorioFuncionario, setFiltroRelatorioFuncionario] = useState("todos");
  const [filtroRelatorioMes, setFiltroRelatorioMes] = useState(mesAtualISO());
  const [mostrarPainelCadastro, setMostrarPainelCadastro] = useState(false);
  const [mostrarFuncionarios, setMostrarFuncionarios] = useState(false);
  const [mostrarResumo, setMostrarResumo] = useState(true);
  const [mostrarRegistros, setMostrarRegistros] = useState(true);

  const teclasPin = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "limpar", "0", "apagar"];

  useEffect(() => {
    carregarDadosDoSheets();
  }, []);

  function carregarDadosDoSheets() {
    if (!API_URL.includes("script.google.com")) return;

    try {
      setCarregando(true);

      const callbackName = "callbackPontoRDA";
      const script = document.createElement("script");

      window[callbackName] = function (resposta) {
        if (resposta?.success) {
          const funcionariosSheets = resposta.funcionarios || [];
          const pontosSheets = (resposta.pontos || []).map(normalizarPonto);
          const configSheets = resposta.config || {};

          if (funcionariosSheets.length > 0) {
            setColaboradores(funcionariosSheets);
          }

          setPontos(pontosSheets);

          if (configSheets.senhaAdmin) {
            setSenhaAdmin(configSheets.senhaAdmin);
          }

          setMensagem("Dados carregados do Google Sheets.");
        } else {
          setMensagem("Não foi possível carregar os dados do Google Sheets.");
        }

        delete window[callbackName];
        script.remove();
        setCarregando(false);
      };

      script.src = `${API_URL}?acao=listarDados&callback=${callbackName}`;
      script.onerror = function () {
        setMensagem("Falha ao carregar dados do Google Sheets.");
        delete window[callbackName];
        script.remove();
        setCarregando(false);
      };

      document.body.appendChild(script);
    } catch (error) {
      setMensagem("Erro ao carregar dados do Google Sheets.");
      setCarregando(false);
    }
  }

  const pontoHojeFuncionario = useMemo(() => {
    if (!funcionarioLogado) return null;

    return pontos.find(
      p => p.data === hojeISO() && p.colaboradorId === funcionarioLogado.id
    ) || null;
  }, [pontos, funcionarioLogado]);

  const pontoDiaAnteriorFuncionario = useMemo(() => {
    if (!funcionarioLogado) return null;

    return pontos.find(
      p => p.data === ontemISO() && p.colaboradorId === funcionarioLogado.id
    ) || null;
  }, [pontos, funcionarioLogado]);

  const pontosRelatorio = useMemo(() => {
    return pontos.filter(p => {
      const passaFuncionario =
        filtroRelatorioFuncionario === "todos" ||
        p.colaboradorId === filtroRelatorioFuncionario;

      const passaMes =
        !filtroRelatorioMes ||
        String(p.data || "").slice(0, 7) === filtroRelatorioMes;

      return passaFuncionario && passaMes;
    });
  }, [pontos, filtroRelatorioFuncionario, filtroRelatorioMes]);

  const totalRelatorio = useMemo(() => {
    const totalExtras = pontosRelatorio.reduce((acc, p) => acc + calcularExtraDia(p), 0);
    const totalDevedor = pontosRelatorio.reduce((acc, p) => acc + calcularSaldoDevedorDia(p), 0);
    const saldoFinal = pontosRelatorio.reduce((acc, p) => acc + saldoFinalParaMinutos(p.saldoFinal), 0);

    return {
      totalExtras,
      totalDevedor,
      saldoFinal,
    };
  }, [pontosRelatorio]);

  const justificativasPendentes = useMemo(() => {
    return pontos.filter(p =>
      p.justificativa &&
      (!p.statusJustificativa || p.statusJustificativa === "Pendente")
    );
  }, [pontos]);

  const resumo = useMemo(() => {
    return colaboradores.map(colaborador => {
      const registros = pontos.filter(p => p.colaboradorId === colaborador.id);
      const totalExtras = registros.reduce((acc, p) => acc + calcularExtraDia(p), 0);
      const totalDevedor = registros.reduce((acc, p) => acc + calcularSaldoDevedorDia(p), 0);
      const saldoFinal = registros.reduce((acc, p) => acc + saldoFinalParaMinutos(p.saldoFinal), 0);

      return {
        ...colaborador,
        registros,
        totalExtras,
        totalDevedor,
        saldoFinal,
      };
    });
  }, [pontos, colaboradores]);

  function adicionarNumeroPin(numero) {
    setPinFuncionario(prev => `${prev}${numero}`.slice(0, 8));
  }

  function apagarNumeroPin() {
    setPinFuncionario(prev => prev.slice(0, -1));
  }

  function limparPin() {
    setPinFuncionario("");
  }

  function loginFuncionario() {
    const colaborador = colaboradores.find(c => c.id === colaboradorId);

    if (!colaborador) {
      setMensagem("Colaborador não encontrado.");
      return;
    }

    if (colaborador.status !== "Ativo") {
      setMensagem("Este colaborador não está ativo.");
      return;
    }

    if (pinFuncionario === colaborador.pin) {
      setFuncionarioLogado(colaborador);
      setMensagem(`${colaborador.nome} entrou no sistema.`);
      setPinFuncionario("");
    } else {
      setMensagem("PIN incorreto.");
    }
  }

  function sairFuncionario() {
    setFuncionarioLogado(null);
    setPinFuncionario("");
    setMensagem("Funcionário saiu do sistema.");
  }

  function abrirAdmin() {
    setSenhaAdminDigitada("");
    setModalAdminAberto(true);
  }

  function confirmarLoginAdmin() {
    if (senhaAdminDigitada === senhaAdmin) {
      setAdminLogado(true);
      setModo("admin");
      setModalAdminAberto(false);
      setSenhaAdminDigitada("");
      setMensagem("Administrador liberado.");
    } else {
      setMensagem("Senha incorreta.");
    }
  }

  function sairAdmin() {
    setAdminLogado(false);
    setModo("funcionario");
    setMensagem("Administrador saiu do sistema.");
  }

  async function registrarPonto(tipo) {
    if (!funcionarioLogado) {
      setMensagem("Faça login com seu PIN antes de registrar o ponto.");
      return;
    }

    const agora = new Date();
    const hora = agora.toTimeString().slice(0, 5);
    const data = hojeISO();

    const pontoExistente = pontos.find(
      p => p.data === data && p.colaboradorId === funcionarioLogado.id
    );

    if (pontoExistente && pontoExistente[tipo]) {
      setMensagem(`${funcionarioLogado.nome}: ${tiposRegistro.find(t => t.key === tipo)?.label || tipo} já foi registrado hoje às ${pontoExistente[tipo]}.`);
      return;
    }

    let novosPontos;

    if (pontoExistente) {
      novosPontos = pontos.map(p =>
        p.id === pontoExistente.id
          ? normalizarPonto({ ...p, [tipo]: hora, origem: "Registro online" })
          : p
      );
    } else {
      novosPontos = [
        ...pontos,
        normalizarPonto({
          id: Date.now(),
          data,
          colaboradorId: funcionarioLogado.id,
          colaboradorNome: funcionarioLogado.nome,
          entrada: "",
          saidaAlmoco: "",
          retornoAlmoco: "",
          saida: "",
          [tipo]: hora,
          origem: "Registro online",
        }),
      ];
    }

    setPontos(novosPontos);
    setMensagem(`${funcionarioLogado.nome}: ${tipo} registrado às ${hora}.`);

    if (API_URL.includes("script.google.com")) {
      try {
        setCarregando(true);
        await fetch(API_URL, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            acao: "registrarPonto",
            colaboradorId: funcionarioLogado.id,
            colaboradorNome: funcionarioLogado.nome,
            tipo,
            data,
            hora,
            registradoEm: formatarDataHora(agora),
          }),
        });

        setTimeout(carregarDadosDoSheets, 900);
      } catch (error) {
        setMensagem("Registro local feito, mas houve falha ao enviar para o Google Sheets.");
      } finally {
        setCarregando(false);
      }
    }
  }

  async function cadastrarFuncionario() {
    if (!adminLogado) {
      setMensagem("Entre como administrador para cadastrar funcionário.");
      return;
    }

    const id = novoFuncionario.id.trim().toLowerCase();
    const nome = novoFuncionario.nome.trim();
    const status = novoFuncionario.status || "Ativo";
    const pin = novoFuncionario.pin.trim();

    if (!id || !nome || !pin) {
      setMensagem("Informe ID, nome e PIN do funcionário.");
      return;
    }

    const jaExiste = colaboradores.some(c => c.id === id);
    if (jaExiste) {
      setMensagem("Já existe um funcionário com esse ID.");
      return;
    }

    const funcionario = { id, nome, status, pin };
    setColaboradores(prev => [...prev, funcionario]);
    setNovoFuncionario({ id: "", nome: "", status: "Ativo", pin: "" });
    setMensagem(`${nome} cadastrado com sucesso.`);

    if (API_URL.includes("script.google.com")) {
      try {
        setCarregando(true);
        await fetch(API_URL, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            acao: "cadastrarFuncionario",
            id,
            nome,
            status,
            pin,
            registradoEm: formatarDataHora(new Date()),
          }),
        });

        setTimeout(carregarDadosDoSheets, 900);
      } catch (error) {
        setMensagem("Funcionário cadastrado localmente, mas houve falha ao enviar para o Google Sheets.");
      } finally {
        setCarregando(false);
      }
    }
  }

  async function removerFuncionario(id) {
    if (!adminLogado) {
      setMensagem("Entre como administrador para remover funcionário.");
      return;
    }

    const confirmar = window.confirm("Deseja realmente remover este funcionário?");
    if (!confirmar) return;

    const funcionario = colaboradores.find(c => c.id === id);
    setColaboradores(colaboradores.filter(c => c.id !== id));
    setMensagem(`${funcionario?.nome || id} removido com sucesso.`);

    if (API_URL.includes("script.google.com")) {
      try {
        setCarregando(true);
        await fetch(API_URL, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            acao: "removerFuncionario",
            id,
          }),
        });

        setTimeout(carregarDadosDoSheets, 900);
      } catch (error) {
        setMensagem("Funcionário removido localmente, mas houve falha ao remover do Google Sheets.");
      } finally {
        setCarregando(false);
      }
    }
  }

  function atualizarHorario(id, campo, valor) {
    if (!adminLogado) return;
    setPontos(pontos.map(p => (p.id === id ? normalizarPonto({ ...p, [campo]: valor, origem: "Editado pelo administrador" }) : p)));
  }

  async function excluirRegistro(id) {
    if (!adminLogado) return;

    const registro = pontos.find(p => p.id === id);

    if (!registro) {
      setMensagem("Registro não encontrado na tela.");
      return;
    }

    const confirmar = window.confirm("Deseja excluir este registro?");
    if (!confirmar) return;

    setPontos(pontos.filter(p => p.id !== id));
    setMensagem("Registro removido.");

    if (API_URL.includes("script.google.com")) {
      try {
        setCarregando(true);

        await fetch(API_URL, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            acao: "excluirRegistroPonto",
            id: registro.id,
            data: registro.data,
            colaboradorId: registro.colaboradorId,
          }),
        });

        setTimeout(carregarDadosDoSheets, 800);
      } catch (error) {
        setMensagem("Registro removido localmente, mas houve falha ao remover do Google Sheets.");
      } finally {
        setCarregando(false);
      }
    }
  }

  async function enviarJustificativaDiaAnterior() {
    if (!funcionarioLogado) {
      setMensagem("Faça login para enviar justificativa.");
      return;
    }

    const justificativa = textoJustificativa.trim();

    if (!justificativa) {
      setMensagem("Informe o motivo da justificativa.");
      return;
    }

    const dataJustificada = ontemISO();

    const registroExistente = pontos.find(
      p => p.data === dataJustificada && p.colaboradorId === funcionarioLogado.id
    );

    if (registroExistente) {
      setPontos(prev => prev.map(p =>
        p.data === dataJustificada && p.colaboradorId === funcionarioLogado.id
          ? normalizarPonto({
              ...p,
              justificativa,
              statusJustificativa: "Pendente",
              origem: "Justificativa enviada"
            })
          : p
      ));
    } else {
      setPontos(prev => [
        ...prev,
        normalizarPonto({
          id: `justificativa-${Date.now()}`,
          data: dataJustificada,
          colaboradorId: funcionarioLogado.id,
          colaboradorNome: funcionarioLogado.nome,
          entrada: "",
          saidaAlmoco: "",
          retornoAlmoco: "",
          saida: "",
          registradoEm: formatarDataHora(new Date()),
          extras: "00:00",
          devedor: "00:00",
          saldoFinal: "00:00",
          justificativa,
          statusJustificativa: "Pendente",
          origem: "Justificativa enviada"
        })
      ]);
    }

    setModalJustificativaAberto(false);
    setTextoJustificativa("");
    setMensagem("Justificativa enviada para aprovação.");

    if (API_URL.includes("script.google.com")) {
      try {
        setCarregando(true);

        await fetch(API_URL, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            acao: "justificarPonto",
            data: dataJustificada,
            colaboradorId: funcionarioLogado.id,
            colaboradorNome: funcionarioLogado.nome,
            justificativa,
          }),
        });

        setTimeout(carregarDadosDoSheets, 900);
      } catch (error) {
        setMensagem("Justificativa salva localmente, mas houve falha ao enviar para o Google Sheets.");
      } finally {
        setCarregando(false);
      }
    }
  }

  async function alterarStatusJustificativa(registro, status) {
    if (!adminLogado) {
      setMensagem("Entre como administrador para alterar justificativas.");
      return;
    }

    setPontos(prev => prev.map(p =>
      p.data === registro.data && p.colaboradorId === registro.colaboradorId
        ? normalizarPonto({ ...p, statusJustificativa: status })
        : p
    ));

    setMensagem(`Justificativa ${status.toLowerCase()}.`);

    if (API_URL.includes("script.google.com")) {
      try {
        setCarregando(true);

        await fetch(API_URL, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            acao: "alterarStatusJustificativa",
            data: registro.data,
            colaboradorId: registro.colaboradorId,
            status,
          }),
        });

        setTimeout(carregarDadosDoSheets, 900);
      } catch (error) {
        setMensagem("Status alterado localmente, mas houve falha ao enviar para o Google Sheets.");
      } finally {
        setCarregando(false);
      }
    }
  }

  function classeStatusJustificativa(status) {
    if (status === "Aprovada") return "bg-green-100 text-green-700 border-green-200";
    if (status === "Reprovada") return "bg-red-100 text-red-700 border-red-200";
    if (status === "Pendente") return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-slate-100 text-slate-500 border-slate-200";
  }

  function limparFiltrosRelatorio() {
    setFiltroRelatorioFuncionario("todos");
    setFiltroRelatorioMes(mesAtualISO());
  }

  return (
    <main className="min-h-screen bg-[#1f1f22] text-slate-900 p-4 relative overflow-hidden">
      <div
        className="fixed inset-0 opacity-[0.035] bg-center bg-no-repeat bg-contain pointer-events-none"
        style={{ backgroundImage: "url('/marca-dagua.png')" }}
      />

      <div className="max-w-6xl mx-auto space-y-4 relative z-10">
        <header className="bg-[#2d2b2c] text-white rounded-2xl p-5 shadow border border-orange-500/30">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/logo-rda.png"
                alt="REI do ACM"
                className="h-16 md:h-20 w-auto object-contain"
              />
            </div>
            <div className="text-left md:text-right">
              <h1 className="text-2xl md:text-3xl font-bold text-white">PontOnline RDA</h1>
              <p className="text-slate-200 mt-1">Registro de ponto com cálculo automático de horas extras</p>
            </div>
          </div>
        </header>

        <section className="bg-[#2d2b2c] rounded-2xl shadow p-4 flex items-center justify-between gap-2 border border-orange-500/20 no-print">
          <div className="flex gap-2">
            <button
              onClick={() => setModo("funcionario")}
              className={`px-4 py-2 rounded-xl font-bold ${modo === "funcionario" ? "bg-[#f15a24] text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
            >
              Funcionário
            </button>

            {modo === "admin" && adminLogado && (
              <button
                onClick={carregarDadosDoSheets}
                disabled={carregando}
                className="px-4 py-2 rounded-xl font-bold bg-white text-[#2d2b2c] disabled:opacity-50"
              >
                Atualizar Sheets
              </button>
            )}
          </div>

          <button
            onClick={abrirAdmin}
            className={`px-4 py-2 rounded-xl font-bold ${modo === "admin" ? "bg-[#f15a24] text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            Administrador
          </button>
        </section>

        {modalAdminAberto && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 no-print">
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow p-5 border border-orange-500/20 w-full max-w-sm space-y-4">
              <h2 className="text-xl font-bold">Acesso administrador</h2>
              <div>
                <label className="text-sm text-slate-500">Senha do administrador</label>
                <input
                  type="password"
                  value={senhaAdminDigitada}
                  onChange={e => setSenhaAdminDigitada(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") confirmarLoginAdmin();
                  }}
                  placeholder="Digite a senha"
                  className="w-full border rounded-xl p-3 mt-1"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setModalAdminAberto(false)}
                  className="bg-[#2d2b2c] text-white rounded-xl px-4 py-2 font-bold hover:bg-[#f15a24]"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarLoginAdmin}
                  className="bg-orange-500 text-white rounded-xl px-4 py-2 font-bold"
                >
                  Entrar
                </button>
              </div>
            </div>
          </div>
        )}

        {modalJustificativaAberto && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 no-print">
            <div className="bg-white rounded-2xl shadow p-5 border border-orange-500/20 w-full max-w-lg space-y-4">
              <div>
                <h2 className="text-xl font-bold">Justificar ponto do dia anterior</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Data: {ontemISO()}
                </p>
              </div>

              {pontoDiaAnteriorFuncionario ? (
                <div className="bg-slate-50 rounded-xl border p-3 text-sm">
                  <p><strong>Entrada:</strong> {horaInput(pontoDiaAnteriorFuncionario.entrada) || "Pendente"}</p>
                  <p><strong>Saída almoço:</strong> {horaInput(pontoDiaAnteriorFuncionario.saidaAlmoco) || "Pendente"}</p>
                  <p><strong>Retorno:</strong> {horaInput(pontoDiaAnteriorFuncionario.retornoAlmoco) || "Pendente"}</p>
                  <p><strong>Saída:</strong> {horaInput(pontoDiaAnteriorFuncionario.saida) || "Pendente"}</p>
                </div>
              ) : (
                <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-3 text-sm text-yellow-700">
                  Nenhum ponto encontrado no dia anterior.<br />
                  Você ainda pode enviar justificativa de ausência completa, como atestado, consulta médica ou emergência.
                </div>
              )}

              <div>
                <label className="text-sm text-slate-500">Motivo da justificativa</label>
                <textarea
                  value={textoJustificativa}
                  onChange={e => setTextoJustificativa(e.target.value)}
                  placeholder="Descreva o motivo..."
                  className="w-full border rounded-xl p-3 mt-1 min-h-32"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setModalJustificativaAberto(false);
                    setTextoJustificativa("");
                  }}
                  className="bg-[#2d2b2c] text-white rounded-xl px-4 py-2 font-bold hover:bg-[#f15a24]"
                >
                  Cancelar
                </button>

                <button
                  onClick={enviarJustificativaDiaAnterior}
                  disabled={carregando}
                  className="bg-[#f15a24] text-white rounded-xl px-4 py-2 font-bold disabled:opacity-50"
                >
                  Enviar justificativa
                </button>
              </div>
            </div>
          </div>
        )}

        {mensagem && (
          <div className="bg-[#fff3ed] border border-[#f15a24]/30 text-[#2d2b2c] rounded-xl p-3 no-print">
            {mensagem}
          </div>
        )}

        {modo === "funcionario" && (
          <section className="bg-white/95 backdrop-blur rounded-2xl shadow p-5 space-y-4 border border-orange-500/20">
            {!funcionarioLogado ? (
              <>
                <h2 className="text-xl font-bold">Login do funcionário</h2>

                <div>
                  <label className="text-sm text-slate-500">Colaborador</label>
                  <select
                    value={colaboradorId}
                    onChange={e => setColaboradorId(e.target.value)}
                    className="w-full border rounded-xl p-3 mt-1"
                  >
                    {colaboradores
                      .filter(c => c.status === "Ativo")
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-500">PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pinFuncionario}
                    onChange={e => setPinFuncionario(e.target.value)}
                    onFocus={() => setMostrarTecladoPin(true)}
                    onKeyDown={e => {
                      if (e.key === "Enter") loginFuncionario();
                    }}
                    placeholder="Digite seu PIN"
                    className="w-full border rounded-xl p-4 mt-1 text-center text-2xl tracking-[0.35em] font-bold"
                  />

                  <button
                    onClick={loginFuncionario}
                    className="w-full mt-4 bg-[#f15a24] hover:bg-[#d94f1f] text-white rounded-xl px-5 py-3 font-bold"
                  >
                    Entrar
                  </button>

                  {mostrarTecladoPin && (
                    <div className="grid grid-cols-3 gap-3 mt-4 max-w-sm mx-auto">
                      {teclasPin.map(tecla => {
                        if (tecla === "limpar") {
                          return (
                            <button
                              key={tecla}
                              type="button"
                              onClick={limparPin}
                              className="bg-slate-200 text-slate-900 rounded-2xl p-4 font-bold text-lg hover:bg-slate-300"
                            >
                              Limpar
                            </button>
                          );
                        }

                        if (tecla === "apagar") {
                          return (
                            <button
                              key={tecla}
                              type="button"
                              onClick={apagarNumeroPin}
                              className="bg-slate-200 text-slate-900 rounded-2xl p-4 font-bold text-lg hover:bg-slate-300"
                            >
                              ⌫
                            </button>
                          );
                        }

                        return (
                          <button
                            key={tecla}
                            type="button"
                            onClick={() => adicionarNumeroPin(tecla)}
                            className="bg-[#2d2b2c] text-white rounded-2xl p-4 font-black text-2xl hover:bg-[#f15a24] shadow"
                          >
                            {tecla}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="bg-slate-50 border rounded-2xl p-4">
                  <p className="text-sm text-slate-500">Funcionário logado</p>
                  <h2 className="text-xl font-bold">{funcionarioLogado.nome}</h2>
                  <p className="text-sm text-slate-500">Data de hoje: {hojeISO()}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {tiposRegistro.map(tipo => {
                    const horarioRegistrado = pontoHojeFuncionario?.[tipo.key];

                    return (
                      <div
                        key={tipo.key}
                        className={`rounded-2xl p-4 border shadow-sm ${horarioRegistrado
                          ? "bg-green-50 border-green-200"
                          : "bg-orange-50 border-orange-200"
                          }`}
                      >
                        <p className="text-sm text-slate-500">{tipo.label}</p>
                        <p className={`text-2xl font-black mt-1 ${horarioRegistrado ? "text-green-700" : "text-orange-700"
                          }`}>
                          {horarioRegistrado || "Pendente"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Padrão {tipo.padrao}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {tiposRegistro.map(tipo => (
                    <button
                      key={tipo.key}
                      disabled={carregando}
                      onClick={() => registrarPonto(tipo.key)}
                      className="bg-[#2d2b2c] text-white rounded-2xl p-5 font-bold text-lg shadow hover:bg-[#f15a24] disabled:opacity-50 border border-orange-500/20"
                    >
                      {tipo.label}
                      <span className="block text-xs text-slate-300 mt-1">Padrão {tipo.padrao}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setModalJustificativaAberto(true)}
                    className="bg-[#f15a24] text-white rounded-xl px-4 py-2 font-bold hover:bg-[#d94f1f]"
                  >
                    Justificar dia anterior
                  </button>

                  <button
                    onClick={sairFuncionario}
                    className="bg-[#2d2b2c] text-white rounded-xl px-4 py-2 font-bold hover:bg-[#f15a24]"
                  >
                    Sair
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {modo === "admin" && adminLogado && (
          <section className="space-y-4">
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow p-5 border border-orange-500/20 space-y-3 no-print">
              <div className="flex justify-between gap-3 items-center flex-wrap">
                <div>
                  <h2 className="text-xl font-bold">Área do administrador</h2>
                  <p className="text-sm text-slate-500">Use os controles abaixo para reorganizar e filtrar sem mexer no código.</p>
                </div>
                <button
                  onClick={sairAdmin}
                  className="bg-[#2d2b2c] text-white rounded-xl px-4 py-2 font-bold hover:bg-[#f15a24]"
                >
                  Sair do admin
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => setMostrarPainelCadastro(prev => !prev)}
                  className="px-4 py-2 rounded-xl font-bold bg-slate-100 hover:bg-slate-200"
                >
                  {mostrarPainelCadastro ? "Ocultar cadastro" : "Mostrar cadastro"}
                </button>
                <button
                  onClick={() => setMostrarFuncionarios(prev => !prev)}
                  className="px-4 py-2 rounded-xl font-bold bg-slate-100 hover:bg-slate-200"
                >
                  {mostrarFuncionarios ? "Ocultar funcionários" : "Mostrar funcionários"}
                </button>
                <button
                  onClick={() => setMostrarResumo(prev => !prev)}
                  className="px-4 py-2 rounded-xl font-bold bg-slate-100 hover:bg-slate-200"
                >
                  {mostrarResumo ? "Ocultar resumo" : "Mostrar resumo"}
                </button>
                <button
                  onClick={() => setMostrarRegistros(prev => !prev)}
                  className="px-4 py-2 rounded-xl font-bold bg-slate-100 hover:bg-slate-200"
                >
                  {mostrarRegistros ? "Ocultar registros" : "Mostrar registros"}
                </button>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur rounded-2xl shadow p-5 border border-orange-500/20 overflow-x-auto no-print">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold">Justificativas pendentes</h2>
                  <p className="text-sm text-slate-500">
                    Aprove ou reprove solicitações enviadas pelos funcionários.
                  </p>
                </div>

                <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full px-4 py-2 text-sm font-bold">
                  {justificativasPendentes.length} pendente(s)
                </span>
              </div>

              {justificativasPendentes.length === 0 ? (
                <div className="bg-slate-50 border rounded-2xl p-4 text-slate-500">
                  Nenhuma justificativa pendente no momento.
                </div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border p-2">Data</th>
                      <th className="border p-2">Funcionário</th>
                      <th className="border p-2">Motivo</th>
                      <th className="border p-2">Status</th>
                      <th className="border p-2">Ação</th>
                    </tr>
                  </thead>

                  <tbody>
                    {justificativasPendentes.map(p => {
                      const colaborador = colaboradores.find(c => c.id === p.colaboradorId);

                      return (
                        <tr key={`justificativa-${p.id}`}>
                          <td className="border p-2 text-center">{p.data}</td>
                          <td className="border p-2">
                            {colaborador?.nome || p.colaboradorNome || p.colaboradorId}
                          </td>
                          <td className="border p-2 max-w-md">
                            {p.justificativa}
                          </td>
                          <td className="border p-2 text-center">
                            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${classeStatusJustificativa(p.statusJustificativa || "Pendente")}`}>
                              {p.statusJustificativa || "Pendente"}
                            </span>
                          </td>
                          <td className="border p-2 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => alterarStatusJustificativa(p, "Aprovada")}
                                disabled={carregando}
                                className="bg-green-600 text-white rounded-lg px-3 py-2 text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                              >
                                Aprovar
                              </button>

                              <button
                                onClick={() => alterarStatusJustificativa(p, "Reprovada")}
                                disabled={carregando}
                                className="bg-red-600 text-white rounded-lg px-3 py-2 text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                              >
                                Reprovar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-white/95 backdrop-blur rounded-2xl shadow p-5 border border-orange-500/20 overflow-x-auto">
              <div className="bg-white rounded-2xl shadow p-5 border border-orange-500/20">
                <div className="no-print">
                  <div className="flex flex-col md:flex-row md:items-end gap-3 justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-[#2d2b2c]">
                        Relatório de Horas Extras
                      </h2>
                      <p className="text-slate-500 text-sm">
                        Filtre por colaborador e referência antes de imprimir.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={limparFiltrosRelatorio}
                        className="bg-slate-100 hover:bg-slate-200 text-[#2d2b2c] rounded-xl px-5 py-3 font-bold shadow"
                      >
                        Limpar filtros
                      </button>

                      <button
                        onClick={() => {
                          document
                            .getElementById("topo-relatorio")
                            ?.scrollIntoView({ behavior: "instant" });

                          setTimeout(() => {
                            window.print();
                          }, 150);
                        }}
                        className="bg-[#f15a24] hover:bg-[#d94f1f] text-white rounded-xl px-5 py-3 font-bold shadow"
                      >
                        Imprimir / Salvar PDF
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="text-sm text-slate-500">
                        Filtrar colaborador
                      </label>

                      <select
                        className="w-full border rounded-xl p-3 mt-1"
                        value={filtroRelatorioFuncionario}
                        onChange={e => setFiltroRelatorioFuncionario(e.target.value)}
                      >
                        <option value="todos">Todos</option>

                        {colaboradores.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-slate-500">
                        Referência
                      </label>

                      <input
                        type="month"
                        value={filtroRelatorioMes}
                        onChange={e => setFiltroRelatorioMes(e.target.value)}
                        className="w-full border rounded-xl p-3 mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                    <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
                      <p className="text-sm text-slate-500">Total extras</p>
                      <strong className="text-2xl text-green-700">{minutosTexto(totalRelatorio.totalExtras)}</strong>
                    </div>
                    <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
                      <p className="text-sm text-slate-500">Total devedor</p>
                      <strong className="text-2xl text-red-700">{minutosTexto(totalRelatorio.totalDevedor)}</strong>
                    </div>
                    <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4">
                      <p className="text-sm text-slate-500">Saldo final</p>
                      <strong className={`text-2xl ${totalRelatorio.saldoFinal < 0 ? "text-red-700" : "text-green-700"}`}>
                        {formatarSaldoFinal(totalRelatorio.saldoFinal)}
                      </strong>
                    </div>
                    <div className="rounded-2xl bg-slate-50 border p-4">
                      <p className="text-sm text-slate-500">Registros filtrados</p>
                      <strong className="text-2xl text-[#2d2b2c]">{pontosRelatorio.length}</strong>
                    </div>
                  </div>
                </div>

                <div id="topo-relatorio"></div>
                <div id="relatorio-print" className="mt-6 bg-white rounded-2xl border p-5 scroll-mt-0">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <div>
                      <h1 className="text-3xl font-black text-[#2d2b2c]">
                        RELATÓRIO DE HORAS EXTRAS
                      </h1>

                      <p className="text-slate-500 mt-1">
                        PontOnline RDA — referência {filtroRelatorioMes || "Todas"}
                      </p>

                      <p className="text-slate-500 text-sm">
                        Colaborador: {
                          filtroRelatorioFuncionario === "todos"
                            ? "Todos"
                            : colaboradores.find(c => c.id === filtroRelatorioFuncionario)?.nome || filtroRelatorioFuncionario
                        }
                      </p>
                    </div>

                    <img
                      src="/logo-rda.png"
                      alt="Logo"
                      className="h-14 object-contain"
                    />
                  </div>

                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border p-2">Data</th>
                        <th className="border p-2">Funcionário</th>
                        <th className="border p-2">Entrada</th>
                        <th className="border p-2">Saída Almoço</th>
                        <th className="border p-2">Retorno</th>
                        <th className="border p-2">Saída</th>
                        <th className="border p-2">Extras</th>
                        <th className="border p-2">Devedor</th>
                        <th className="border p-2">Saldo Final</th>
                        <th className="border p-2">Justificativa</th>
                        <th className="border p-2">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {pontosRelatorio.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="border p-4 text-center text-slate-500">
                            Nenhum registro encontrado para os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        pontosRelatorio.map(p => {
                          const colaborador = colaboradores.find(
                            c => c.id === p.colaboradorId
                          );

                          return (
                            <tr key={`relatorio-${p.id}`}>
                              <td className="border p-2 text-center">
                                {p.data}
                              </td>

                              <td className="border p-2">
                                {colaborador?.nome || p.colaboradorNome}
                              </td>

                              <td className="border p-2 text-center">
                                {horaInput(p.entrada)}
                              </td>

                              <td className="border p-2 text-center">
                                {horaInput(p.saidaAlmoco)}
                              </td>

                              <td className="border p-2 text-center">
                                {horaInput(p.retornoAlmoco)}
                              </td>

                              <td className="border p-2 text-center">
                                {horaInput(p.saida)}
                              </td>

                              <td className="border p-2 text-center font-black text-green-700">
                                {p.extras || "00:00"}
                              </td>

                              <td className="border p-2 text-center font-black text-red-700">
                                {p.devedor || "00:00"}
                              </td>

                              <td className={`border p-2 text-center font-black ${String(p.saldoFinal || "").startsWith("-") ? "text-red-700" : "text-green-700"}`}>
                                {p.saldoFinal || "00:00"}
                              </td>

                              <td className="border p-2">
                                {p.justificativa || "-"}
                              </td>

                              <td className="border p-2 text-center">
                                {p.statusJustificativa || "-"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-right">
                    <div>
                      <p className="text-sm text-slate-500">
                        Total de horas extras
                      </p>

                      <h2 className="text-2xl font-black text-green-700">
                        {minutosTexto(totalRelatorio.totalExtras)}
                      </h2>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">
                        Total devedor
                      </p>

                      <h2 className="text-2xl font-black text-red-700">
                        {minutosTexto(totalRelatorio.totalDevedor)}
                      </h2>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">
                        Saldo final
                      </p>

                      <h2 className={`text-2xl font-black ${totalRelatorio.saldoFinal < 0 ? "text-red-700" : "text-green-700"}`}>
                        {formatarSaldoFinal(totalRelatorio.saldoFinal)}
                      </h2>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {mostrarPainelCadastro && (
              <div className="bg-white/95 backdrop-blur rounded-2xl shadow p-5 border border-orange-500/20 space-y-3 no-print">
                <h2 className="text-xl font-bold">Cadastrar funcionário</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-sm text-slate-500">ID de acesso</label>
                    <input
                      value={novoFuncionario.id}
                      onChange={e => setNovoFuncionario({ ...novoFuncionario, id: e.target.value })}
                      placeholder="ex: joao"
                      className="w-full border rounded-xl p-3 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Nome completo</label>
                    <input
                      value={novoFuncionario.nome}
                      onChange={e => setNovoFuncionario({ ...novoFuncionario, nome: e.target.value })}
                      placeholder="Nome do funcionário"
                      className="w-full border rounded-xl p-3 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Status</label>
                    <select
                      value={novoFuncionario.status}
                      onChange={e => setNovoFuncionario({ ...novoFuncionario, status: e.target.value })}
                      className="w-full border rounded-xl p-3 mt-1"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={novoFuncionario.pin}
                      onChange={e => setNovoFuncionario({ ...novoFuncionario, pin: e.target.value })}
                      placeholder="ex: 1234"
                      className="w-full border rounded-xl p-3 mt-1"
                    />
                  </div>
                </div>
                <button
                  onClick={cadastrarFuncionario}
                  disabled={carregando}
                  className="bg-orange-500 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-50"
                >
                  Cadastrar funcionário
                </button>
              </div>
            )}

            {mostrarFuncionarios && (
              <div className="bg-white/95 backdrop-blur rounded-2xl shadow p-5 border border-orange-500/20 overflow-x-auto no-print">
                <h2 className="text-xl font-bold mb-3">Funcionários cadastrados</h2>

                <table className="w-full text-sm border-collapse mb-6">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border p-2">ID</th>
                      <th className="border p-2">Nome</th>
                      <th className="border p-2">Status</th>
                      <th className="border p-2">PIN</th>
                      <th className="border p-2">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colaboradores.map(c => (
                      <tr key={c.id}>
                        <td className="border p-2 text-center">{c.id}</td>
                        <td className="border p-2">{c.nome}</td>
                        <td className="border p-2 text-center">{c.status}</td>
                        <td className="border p-2 text-center">{c.pin}</td>
                        <td className="border p-2 text-center">
                          <button
                            onClick={() => removerFuncionario(c.id)}
                            className="bg-red-600 text-white rounded-lg px-3 py-1 hover:bg-red-700"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {mostrarResumo && (
              <div className="bg-white/95 backdrop-blur rounded-2xl shadow p-5 border border-orange-500/20 no-print">
                <h2 className="text-xl font-bold mb-3">Resumo geral</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {resumo.map(item => (
                    <div key={item.id} className="border rounded-2xl p-4 bg-slate-50">
                      <h3 className="font-bold">{item.nome}</h3>
                      <p className="text-sm text-slate-500">Registros: {item.registros.length}</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm">
                          Extras: <strong className="text-green-700">{minutosTexto(item.totalExtras)}</strong>
                        </p>

                        <p className="text-sm">
                          Devedor: <strong className="text-red-700">{minutosTexto(item.totalDevedor)}</strong>
                        </p>

                        <p className={`text-lg font-black ${item.saldoFinal < 0 ? "text-red-700" : "text-[#f15a24]"}`}>
                          Saldo final: {formatarSaldoFinal(item.saldoFinal)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mostrarRegistros && (
              <div className="bg-white/95 backdrop-blur rounded-2xl shadow p-5 border border-orange-500/20 overflow-x-auto no-print">
                <h2 className="text-xl font-bold mb-3">Registros de ponto</h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border p-2">Data</th>
                      <th className="border p-2">Colaborador</th>
                      <th className="border p-2">Entrada</th>
                      <th className="border p-2">Saída Almoço</th>
                      <th className="border p-2">Retorno</th>
                      <th className="border p-2">Saída</th>
                      <th className="border p-2">Extras</th>
                      <th className="border p-2">Devedor</th>
                      <th className="border p-2">Saldo Final</th>
                      <th className="border p-2">Justificativa</th>
                      <th className="border p-2">Status</th>
                      <th className="border p-2">Origem</th>
                      <th className="border p-2">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pontos.map(p => {
                      const colaborador = colaboradores.find(c => c.id === p.colaboradorId);
                      return (
                        <tr key={p.id}>
                          <td className="border p-2 text-center">{p.data}</td>
                          <td className="border p-2">{colaborador?.nome || p.colaboradorNome || p.colaboradorId}</td>
                          {["entrada", "saidaAlmoco", "retornoAlmoco", "saida"].map(campo => (
                            <td key={campo} className="border p-2">
                              <input
                                type="time"
                                value={horaInput(p[campo])}
                                disabled={!adminLogado}
                                onChange={e => atualizarHorario(p.id, campo, e.target.value)}
                                className="border rounded-lg p-1 w-full disabled:bg-slate-100"
                              />
                            </td>
                          ))}
                          <td className="border p-2 text-center font-bold text-green-700">{p.extras || "00:00"}</td>
                          <td className="border p-2 text-center font-bold text-red-700">{p.devedor || "00:00"}</td>
                          <td className={`border p-2 text-center font-bold ${String(p.saldoFinal || "").startsWith("-") ? "text-red-700" : "text-green-700"}`}>
                            {p.saldoFinal || "00:00"}
                          </td>
                          <td className="border p-2 max-w-xs">
                            {p.justificativa ? (
                              <span className="text-sm text-slate-700">{p.justificativa}</span>
                            ) : (
                              <span className="text-slate-400">Sem justificativa</span>
                            )}
                          </td>
                          <td className="border p-2 text-center">
                            <div className="flex flex-col gap-2 items-center">
                              <span className={`px-3 py-1 rounded-full border text-xs font-bold ${classeStatusJustificativa(p.statusJustificativa)}`}>
                                {p.statusJustificativa || "Sem status"}
                              </span>

                              {p.justificativa && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => alterarStatusJustificativa(p, "Aprovada")}
                                    className="bg-green-600 text-white rounded-lg px-2 py-1 text-xs font-bold hover:bg-green-700"
                                  >
                                    Aprovar
                                  </button>

                                  <button
                                    onClick={() => alterarStatusJustificativa(p, "Reprovada")}
                                    className="bg-red-600 text-white rounded-lg px-2 py-1 text-xs font-bold hover:bg-red-700"
                                  >
                                    Reprovar
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="border p-2 text-center">{p.origem}</td>
                          <td className="border p-2 text-center">
                            <button
                              disabled={!adminLogado}
                              onClick={() => excluirRegistro(p.id)}
                              className="bg-red-600 text-white rounded-lg px-3 py-1 disabled:opacity-40"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
