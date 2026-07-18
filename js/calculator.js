window.AtlasCalculator = (() => {
  const calculator = document.getElementById("calculator");
  const display = document.getElementById("calcDisplay");
  const keysContainer = document.getElementById("keys");
  const toggleButton = document.getElementById("calculatorBtn");

  const keys = [
    "C","(",")","÷",
    "7","8","9","×",
    "4","5","6","−",
    "1","2","3","+",
    "0",",","⌫","="
  ];

  let expression = "";

  function render() {
    display.value = expression || "0";
  }

  function calculate() {
    try {
      const safe = expression
        .replace(/,/g,".")
        .replace(/×/g,"*")
        .replace(/÷/g,"/")
        .replace(/−/g,"-");

      const result = Function('"use strict";return (' + safe + ')')();
      expression = String(result).replace(".",",");
      render();
    } catch {
      display.value = "Erreur";
      expression = "";
    }
  }

  toggleButton.addEventListener("click", () => {
    calculator.classList.toggle("open");
  });

  keys.forEach(key => {
    const b = document.createElement("button");
    b.className = "key";
    b.textContent = key;

    b.onclick = () => {
      if (key === "C") expression = "";
      else if (key === "⌫") expression = expression.slice(0,-1);
      else if (key === "=") return calculate();
      else expression += key;
      render();
    };

    keysContainer.appendChild(b);
  });

  render();
})();

