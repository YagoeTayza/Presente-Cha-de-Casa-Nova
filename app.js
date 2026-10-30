(() => {
  const names = [
    "Micro-ondas","Liquidificador","Sanduicheira","Batedeira","Airfryer","Ferro de passar",
    "Panela de pressão","Conjunto de edredom","Jogo de jantar","Ventilador","Toalha","Jogo de faca",
    "Garrafa de café","Travessa","Fruteira","Jogo de prato","Frigideira","Faqueiro",
    "Jogo de copo","Pipoqueira tradicional","Jogo de panela","Forma de bolo","Porta tempero",
    "Jogo de utensílios","Jogo de taça","Jogo de faqueiro","Poncheira de suco","Tábua de passar",
    "Jogo de lençol","Jogo de toalha","Garrafa de água"
  ];
  const $ = id => document.getElementById(id);
  let supabaseClient, selectedId = null, gifts = [];

  function status(message, error=false) {
    $("status").textContent = message;
    $("status").style.color = error ? "#a12d25" : "#8a6248";
  }
  function whatsappLink(number, person, gift) {
    const message = `Olá! 🏡❤️ ${person} escolheu ${gift} como presente para o Chá de Casa Nova de Tayza e Yago.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }
  function render() {
    const available = gifts.filter(g => !g.claimed_by).length;
    $("available-count").textContent = available;
    const container = $("items");
    container.replaceChildren();
    gifts.forEach(g => {
      const button = document.createElement("button");
      button.className = "item" + (selectedId === g.id ? " selected" : "");
      button.disabled = !!g.claimed_by;
      button.type = "button";
      const label = document.createElement("span");
      label.textContent = g.name;
      const pill = document.createElement("span");
      pill.className = "pill" + (g.claimed_by ? " taken" : "");
      pill.textContent = g.claimed_by ? "OK" : "DISPONÍVEL";
      button.append(label,pill);
      button.addEventListener("click", () => { selectedId = g.id; render(); });
      container.append(button);
    });
    $("confirm-button").disabled = !selectedId || ! $("guest-name").value.trim();
  }
  async function loadGifts() {
    const {data,error} = await supabaseClient.from("gifts").select("id,name,claimed_by").order("sort_order");
    if (error) { status("Não foi possível carregar a lista. Confira a configuração do Supabase.", true); return; }
    gifts = data || [];
    render();
  }
  async function confirmGift() {
    const person = $("guest-name").value.trim();
    const gift = gifts.find(g => g.id === selectedId && !g.claimed_by);
    if (!person || !gift) return;
    $("confirm-button").disabled = true;
    status("Registrando sua escolha…");
    const {data,error} = await supabaseClient.rpc("claim_gift", {gift_id: selectedId, guest_name: person});
    if (error || !data?.ok) {
      status(data?.message || "Este presente acabou de ser escolhido por outra pessoa. Atualizando a lista…", true);
      selectedId = null;
      await loadGifts();
      $("confirm-button").disabled = true;
      return;
    }
    selectedId = null;
    await loadGifts();
    status(`Obrigado, ${person}! Sua escolha foi registrada.`);
    $("wa-one").href = whatsappLink(window.CHA_CONFIG.WHATSAPP_1, person, gift.name);
    $("wa-two").href = whatsappLink(window.CHA_CONFIG.WHATSAPP_2, person, gift.name);
    $("whatsapp-actions").hidden = false;
  }
  async function start() {
    const c = window.CHA_CONFIG || {};
    if (!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY || c.SUPABASE_URL.startsWith("COLE_AQUI")) {
      status("Site criado. Falta conectar o banco Supabase conforme o arquivo LEIA-ME.", true);
      $("items").innerHTML = '<p class="loading">A lista aparecerá assim que o banco for configurado.</p>';
      return;
    }
    supabaseClient = window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY);
    $("guest-name").addEventListener("input",render);
    $("confirm-button").addEventListener("click",confirmGift);
    await loadGifts();
    supabaseClient.channel("gifts-live").on("postgres_changes",{event:"*",schema:"public",table:"gifts"},loadGifts).subscribe();
  }
  document.addEventListener("DOMContentLoaded",start);
})();
