var style = document.createElement("style");

style.innerHTML = `
#dr-public-app{
  width:100%;
  max-width:520px;
  margin:40px auto;
  padding:28px;
  background:#111;
  color:#eee;
  font-family:Arial, sans-serif;
  border-radius:18px;
  box-shadow:0 20px 60px rgba(0,0,0,.45);
  text-align:center;
}

#dr-public-app h1{
  margin:0 0 8px;
  font-size:32px;
  letter-spacing:-1px;
}

#dr-public-app p{
  color:#aaa;
  margin:0 0 22px;
}

#dr-username{
  width:100%;
  padding:14px;
  font-size:16px;
  border-radius:10px;
  border:1px solid #333;
  background:#050505;
  color:#fff;
  box-sizing:border-box;
  margin-bottom:12px;
}

.dr-button{
  padding:13px 18px;
  border:0;
  border-radius:10px;
  background:#fff;
  color:#111;
  font-weight:bold;
  cursor:pointer;
  margin:5px;
}

.dr-button.secondary{
  background:#222;
  color:#eee;
  border:1px solid #333;
}

#dr-status{
  margin:18px 0;
  color:#aaa;
  font-size:14px;
}

#dr-cover{
  width:280px;
  height:280px;
  object-fit:cover;
  border-radius:14px;
  display:none;
  margin:20px auto;
  box-shadow:0 10px 30px rgba(0,0,0,.5);
}

#dr-artist{
  font-size:22px;
  margin:12px 0 4px;
}

#dr-title{
  font-size:18px;
  color:#ddd;
  margin:0;
}

#dr-year{
  color:#888;
  margin-top:8px;
}

#dr-youtube a{
  display:inline-block;
  margin-top:16px;
  color:#fff;
  background:#e62117;
  padding:10px 14px;
  border-radius:8px;
  text-decoration:none;
  font-weight:bold;
}

#dr-history{
  margin-top:24px;
  text-align:left;
  border-top:1px solid #222;
  padding-top:16px;
}

#dr-history h3{
  font-size:14px;
  color:#888;
  text-transform:uppercase;
}

#dr-history-list{
  max-height:160px;
  overflow:auto;
  padding-left:20px;
  color:#bbb;
}
`;

document.head.appendChild(style);

document.getElementById("discogs-roulette-public").innerHTML = `
<div id="dr-public-app">
  <h1>Discogs Roulette</h1>
  <p>Digite um usuário público do Discogs e sorteie um disco da coleção.</p>

  <input id="dr-username" placeholder="usuário do Discogs">

  <div>
    <button class="dr-button" id="dr-connect">Conectar</button>
    <button class="dr-button secondary" id="dr-random">Sortear disco</button>
    <button class="dr-button secondary" id="dr-reset">Zerar histórico</button>
  </div>

  <div id="dr-status">Nenhuma coleção conectada.</div>

  <img id="dr-cover">

  <h2 id="dr-artist">---</h2>
  <p id="dr-title">---</p>
  <p id="dr-year">---</p>

  <div id="dr-youtube"></div>

  <div id="dr-history">
    <h3>Histórico</h3>
    <ol id="dr-history-list"></ol>
  </div>
</div>
`;

var USERNAME = localStorage.getItem("dr_public_username") || "";
var discos = [];
var sorteados = JSON.parse(localStorage.getItem("dr_public_sorteados") || "[]");
var historico = JSON.parse(localStorage.getItem("dr_public_historico") || "[]");

if(USERNAME){
  document.getElementById("dr-username").value = USERNAME;
  document.getElementById("dr-status").textContent = "Usuário salvo: " + USERNAME;
}

function salvar(){
  localStorage.setItem("dr_public_username", USERNAME);
  localStorage.setItem("dr_public_sorteados", JSON.stringify(sorteados));
  localStorage.setItem("dr_public_historico", JSON.stringify(historico));
}

function atualizarHistorico(){
  var lista = document.getElementById("dr-history-list");
  lista.innerHTML = "";

  historico.slice().reverse().forEach(function(item){
    var li = document.createElement("li");
    li.textContent = item;
    lista.appendChild(li);
  });
}

async function carregarColecao(){
  discos = [];

  var page = 1;
  var totalPages = 1;

  while(page <= totalPages){
    var url =
      "https://api.discogs.com/users/" +
      USERNAME +
      "/collection/folders/0/releases?page=" +
      page +
      "&per_page=100";

    var resposta = await fetch(url);
    var dados = await resposta.json();

    if(!dados.releases){
      throw new Error("Coleção privada, usuário inválido ou erro no Discogs.");
    }

    discos = discos.concat(dados.releases);
    totalPages = dados.pagination.pages;
    page++;
  }
}

document.getElementById("dr-connect").onclick = async function(){
  USERNAME = document.getElementById("dr-username").value.trim();

  if(!USERNAME){
    document.getElementById("dr-status").textContent = "Digite um usuário do Discogs.";
    return;
  }

  document.getElementById("dr-status").textContent = "Carregando coleção...";

  try{
    sorteados = [];
    historico = [];
    salvar();
    atualizarHistorico();

    await carregarColecao();

    document.getElementById("dr-status").textContent =
      "Coleção conectada: " + USERNAME + " — " + discos.length + " discos encontrados.";

  }catch(err){
    document.getElementById("dr-status").textContent = err.message;
  }
};

document.getElementById("dr-random").onclick = async function(){
  if(!USERNAME){
    document.getElementById("dr-status").textContent = "Conecte um usuário primeiro.";
    return;
  }

  try{
    if(discos.length === 0){
      document.getElementById("dr-status").textContent = "Carregando coleção...";
      await carregarColecao();
    }

    var disponiveis = discos.filter(function(d){
      return sorteados.indexOf(d.id) === -1;
    });

    if(disponiveis.length === 0){
      sorteados = [];
      disponiveis = discos.slice();
      document.getElementById("dr-status").textContent = "Histórico completo. Começando nova rodada.";
    }

    var escolhido = disponiveis[Math.floor(Math.random() * disponiveis.length)];
    var info = escolhido.basic_information;

    var artista = info.artists.map(function(a){
      return a.name.replace(" (2)", "");
    }).join(", ");

    var titulo = info.title;
    var ano = info.year || "Ano desconhecido";
    var capa = info.cover_image || "";

    document.getElementById("dr-artist").textContent = artista;
    document.getElementById("dr-title").textContent = titulo;
    document.getElementById("dr-year").textContent = ano;

    var img = document.getElementById("dr-cover");
    if(capa){
      img.src = capa;
      img.style.display = "block";
    }

    var busca = encodeURIComponent(artista + " " + titulo + " album");
    document.getElementById("dr-youtube").innerHTML =
      '<a target="_blank" href="https://www.youtube.com/results?search_query=' +
      busca +
      '">Ouvir no YouTube</a>';

    var texto = artista + " - " + titulo + " (" + ano + ")";

    sorteados.push(escolhido.id);
    historico.push(texto);
    salvar();
    atualizarHistorico();

    document.getElementById("dr-status").textContent =
      "Sorteado. Faltam " + (discos.length - sorteados.length) + " discos nesta rodada.";

  }catch(err){
    document.getElementById("dr-status").textContent = err.message;
  }
};

document.getElementById("dr-reset").onclick = function(){
  sorteados = [];
  historico = [];
  salvar();
  atualizarHistorico();
  document.getElementById("dr-status").textContent = "Histórico zerado.";
};

atualizarHistorico();
