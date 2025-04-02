class PokemonGame {
  constructor() {
    this.pokemonData = null;
    this.selectedStats = new Set();
    this.availableStats = [
      "hp",
      "attack",
      "defense",
      "special-attack",
      "special-defense",
      "speed",
    ];
    this.statNames = {
      hp: "PS",
      attack: "ATK",
      defense: "DEF",
      "special-attack": "SPA",
      "special-defense": "SPD",
      speed: "SPE",
    };
    this.currentPokemon = null;
    this.imaginaryPokemon = {
      name: "Pokémon Imaginario",
      stats: {},
      sprites: {},
      currentSprite: null,
    };
    this.selectedPokemonElement = null;
    this.selectedStatElement = null;
    this.pokemonHistory = [];
    this.shownPokemon = []; // Array para guardar todos los Pokémon mostrados

    // Elementos del DOM
    this.roundNumberElement = document.getElementById("round-number");
    this.pokemonListElement = document.getElementById("pokemon-list");
    this.statsListElement = document.getElementById("stats-list");
    this.imaginaryStatsElement = document.getElementById("imaginary-stats");
    this.totalStatsElement = document.getElementById("total-stats");
    this.selectButton = document.getElementById("select-button");
    this.reloadButton = document.getElementById("reload-data");
    this.historyListElement = document.getElementById("history-list");

    // Event listeners
    this.selectButton.addEventListener("click", () => this.makeSelection());
    // this.reloadButton.addEventListener("click", () => this.reloadPokemonData());

    // Cargar historial desde localStorage
    const savedHistory = localStorage.getItem("pokemonHistory");
    if (savedHistory) {
      this.pokemonHistory = JSON.parse(savedHistory);
    }

    // Iniciar el juego
    this.loadPokemonData();

    // Mostrar historial existente
    this.updateHistoryDisplay();
  }

  async loadPokemonData() {
    try {
      // Intentar cargar desde localStorage primero
      const cachedData = localStorage.getItem("pokemonData");
      if (cachedData) {
        console.log("Cargando datos de Pokémon desde caché...");
        this.pokemonData = JSON.parse(cachedData);
        this.startNewRound();
        return;
      }

      console.log("Cargando datos de Pokémon desde la API...");
      const response = await fetch(
        "https://pokeapi.co/api/v2/pokemon?limit=151"
      );
      const data = await response.json();

      // Cargar datos detallados de cada Pokémon
      const pokemonPromises = data.results.map(async (pokemon) => {
        const response = await fetch(pokemon.url);
        const pokemonData = await response.json();
        return {
          name: pokemonData.name,
          sprite: pokemonData.sprites.front_default,
          stats: pokemonData.stats.reduce((acc, stat) => {
            acc[stat.stat.name] = stat.base_stat;
            return acc;
          }, {}),
        };
      });

      const pokemonDetails = await Promise.all(pokemonPromises);
      this.pokemonData = pokemonDetails.reduce((acc, pokemon) => {
        acc[pokemon.name] = pokemon;
        return acc;
      }, {});

      // Guardar en localStorage
      try {
        localStorage.setItem(
          "pokemonData",
          JSON.stringify(this.pokemonData)
        );
        console.log("Datos de Pokémon guardados en caché");
      } catch (error) {
        console.error("Error al guardar en localStorage:", error);
      }

      this.startNewRound();
    } catch (error) {
      console.error("Error al cargar datos de Pokémon:", error);
      // Mostrar mensaje de error al usuario
      const errorMessage = document.createElement('div');
      errorMessage.className = 'error-message';
      errorMessage.innerHTML = `
        <h3>Error al cargar los datos</h3>
        <p>No se pudieron cargar los datos de Pokémon. Por favor, recarga la página o intenta más tarde.</p>
        <button id="retry-load">Reintentar</button>
      `;
      document.querySelector('.game-container').prepend(errorMessage);
      
      // Añadir evento al botón de reintentar
      document.getElementById('retry-load').addEventListener('click', () => {
        errorMessage.remove();
        this.loadPokemonData();
      });
    }
  }

  async reloadPokemonData() {
    if (
      confirm(
        "¿Estás seguro de que quieres recargar los datos desde la API? Esto puede tardar unos momentos."
      )
    ) {
      // Limpiar localStorage
      localStorage.removeItem("pokemonData");
      localStorage.removeItem("pokemonHistory");

      // Reiniciar el juego
      this.pokemonHistory = [];
      this.updateHistoryDisplay();
      this.resetGame();

      // Cargar nuevos datos
      await this.fetchPokemonData();
    }
  }

  startNewRound() {
    // Verificar que tenemos datos válidos
    if (!this.pokemonData || Object.keys(this.pokemonData).length === 0) {
      console.error("No hay datos de Pokémon disponibles");
      return;
    }

    // Verificar si el juego debería terminar
    if (this.selectedStats.size === 6) {
      console.log("Se alcanzaron las 6 estadísticas en startNewRound");
      this.showFinalResults();
      return;
    }

    // Limpiar elementos del DOM
    this.pokemonListElement.innerHTML = "";

    // Generar nueva ronda
    const pokemonNames = Object.keys(this.pokemonData);
    const selectedNames = this.getRandomPokemon(pokemonNames, 6);

    // Guardar los Pokémon de esta ronda
    const roundPokemon = selectedNames.map((name) => ({
      name: name,
      stats: this.pokemonData[name].stats,
      sprite: this.pokemonData[name].sprite,
    }));

    // Añadir los Pokémon de esta ronda al registro
    this.shownPokemon.push(roundPokemon);

    this.currentRound = roundPokemon;

    // Mostrar Pokémon disponibles
    this.currentRound.forEach((pokemon) => {
      if (pokemon.stats) {
        const card = this.createPokemonCard(pokemon);
        this.pokemonListElement.appendChild(card);
      }
    });

    // Actualizar número de ronda
    this.roundNumberElement.textContent = this.selectedStats.size + 1;
  }

  createPokemonCard(pokemon) {
    if (!pokemon.stats) {
      console.error("Pokémon sin estadísticas:", pokemon);
      return null;
    }

    const card = document.createElement("div");
    card.className = "pokemon-card";

    // Contenedor del sprite
    const spriteContainer = document.createElement("div");
    spriteContainer.className = "pokemon-sprite";
    spriteContainer.innerHTML = `
        <img src="${pokemon.sprite}" alt="${this.capitalize(
      pokemon.name
    )}" loading="lazy">
    `;

    // Contenedor de la información
    const infoContainer = document.createElement("div");
    infoContainer.className = "pokemon-info";

    // Nombre del Pokémon
    const nameElement = document.createElement("div");
    nameElement.className = "pokemon-name";
    nameElement.textContent = this.capitalize(pokemon.name);

    // Contenedor de estadísticas
    const statsContainer = document.createElement("div");
    statsContainer.className = "pokemon-stats";

    // Crear barras de estadísticas
    Object.entries(pokemon.stats).forEach(([stat, value]) => {
      const statBar = document.createElement("div");
      const isAvailable = this.availableStats.includes(stat);
      statBar.className = `stat-bar ${isAvailable ? "selectable" : "disabled"}`;

      const label = document.createElement("div");
      label.className = "stat-label";
      label.textContent = this.statNames[stat];

      const progress = document.createElement("div");
      progress.className = "stat-progress";

      const fill = document.createElement("div");
      fill.className = "stat-fill";

      const percentage = (value / 255) * 100;
      fill.style.width = `${percentage}%`;

      const hue = percentage * 1.2;
      fill.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;

      const valueDisplay = document.createElement("div");
      valueDisplay.className = "stat-value";
      valueDisplay.textContent = value;

      progress.appendChild(fill);
      statBar.appendChild(label);
      statBar.appendChild(progress);
      statBar.appendChild(valueDisplay);

      // Añadir evento de clic solo si la estadística está disponible
      if (isAvailable) {
        statBar.addEventListener("click", () => {
          // Guardar la selección
          this.selectedStats.add(stat);
          this.availableStats = this.availableStats.filter((s) => s !== stat);
          this.imaginaryPokemon.stats[stat] = value;
          this.imaginaryPokemon.sprites[stat] = pokemon.sprite;
          this.imaginaryPokemon.currentSprite = pokemon.sprite;

          // Actualizar interfaz
          this.updateImaginaryPokemon();

          // Actualizar todas las barras de estadísticas en todos los Pokémon
          document.querySelectorAll(".stat-bar").forEach((bar) => {
            const statLabel = bar.querySelector(".stat-label");
            if (statLabel) {
              const statName = statLabel.textContent;
              const statKey = Object.entries(this.statNames).find(
                ([key, val]) => val === statName
              )?.[0];
              if (statKey) {
                if (!this.availableStats.includes(statKey)) {
                  bar.classList.remove("selectable");
                  bar.classList.add("disabled");
                }
              }
            }
          });

          // Si el juego ha terminado
          if (this.selectedStats.size === 6) {
            console.log("¡Juego terminado! Mostrando resultados finales...");
            // Desactivar todas las barras de estadísticas
            document.querySelectorAll(".stat-bar").forEach((bar) => {
              bar.classList.remove("selectable");
              bar.classList.add("disabled");
              bar.style.pointerEvents = "none";
            });

            // Pequeña pausa antes de mostrar el modal
            setTimeout(() => {
              this.showFinalResults();
            }, 500);
          } else {
            console.log("Iniciando nueva ronda...");
            this.startNewRound();
          }
        });
      }

      statsContainer.appendChild(statBar);
    });

    // Ensamblar la tarjeta
    infoContainer.appendChild(nameElement);
    infoContainer.appendChild(statsContainer);
    card.appendChild(spriteContainer);
    card.appendChild(infoContainer);

    return card;
  }

  createStatElement(stat) {
    const element = document.createElement("div");
    element.className = "stat-item";
    element.textContent = this.statNames[stat];
    element.addEventListener("click", () => this.selectStat(stat, element));
    return element;
  }

  selectPokemon(pokemon, element) {
    if (this.selectedPokemonElement) {
      this.selectedPokemonElement.classList.remove("selected");
    }
    element.classList.add("selected");
    this.selectedPokemonElement = element;
    this.currentPokemon = pokemon;
    this.checkSelection();
  }

  selectStat(stat, element) {
    if (this.selectedStatElement) {
      this.selectedStatElement.classList.remove("selected");
    }
    element.classList.add("selected");
    this.selectedStatElement = element;
    this.checkSelection();
  }

  checkSelection() {
    this.selectButton.disabled = !(
      this.currentPokemon && this.selectedStatElement
    );
  }

  makeSelection() {
    if (!this.currentPokemon || !this.selectedStatElement) return;

    const stat =
      this.availableStats[
        Array.from(this.statsListElement.children).indexOf(
          this.selectedStatElement
        )
      ];

    // Guardar la selección
    this.selectedStats.add(stat);
    this.availableStats = this.availableStats.filter((s) => s !== stat);
    this.imaginaryPokemon.stats[stat] = this.currentPokemon.stats[stat];
    this.imaginaryPokemon.sprites[stat] = this.currentPokemon.sprite;
    this.imaginaryPokemon.currentSprite = this.currentPokemon.sprite;

    console.log(`Estadísticas seleccionadas: ${this.selectedStats.size}`);

    // Actualizar interfaz
    this.updateImaginaryPokemon();

    // Si el juego ha terminado (exactamente 6 estadísticas)
    if (this.selectedStats.size === 6) {
      console.log("¡Juego terminado! Mostrando resultados finales...");
      this.showFinalResults();
    } else {
      console.log("Iniciando nueva ronda...");
      this.startNewRound();
    }
  }

  updateImaginaryPokemon() {
    // Crear el contenedor principal
    let html = `
        <div class="imaginary-main">
            ${
              this.imaginaryPokemon.currentSprite
                ? `
                <div class="imaginary-sprite">
                    <img src="${this.imaginaryPokemon.currentSprite}" alt="Pokémon Imaginario" loading="lazy">
                </div>
            `
                : ""
            }
            <div class="imaginary-stats">
                ${Object.entries(this.imaginaryPokemon.stats)
                  .map(([stat, value]) => {
                    const percentage = (value / 255) * 100;
                    const hue = percentage * 1.2;
                    return `
                            <div class="stat-bar">
                                <div class="stat-label">${this.statNames[stat]}</div>
                                <div class="stat-progress">
                                    <div class="stat-fill" style="width: ${percentage}%; background-color: hsl(${hue}, 100%, 50%);"></div>
                                </div>
                                <div class="stat-value">${value}</div>
                            </div>
                        `;
                  })
                  .join("")}
            </div>
        </div>
        ${
          Object.keys(this.imaginaryPokemon.stats).length > 0
            ? `
            <div class="origin-pokemon">
                <h4>Pokémon de Origen</h4>
                <div class="origin-sprites">
                    ${Object.entries(this.imaginaryPokemon.sprites)
                      .map(
                        ([stat, sprite]) => `
                            <div class="origin-sprite-container">
                                <div class="origin-sprite">
                                    <img src="${sprite}" alt="Origen ${this.statNames[stat]}">
                                </div>
                                <div class="origin-stat">${this.statNames[stat]}</div>
                            </div>
                        `
                      )
                      .join("")}
                </div>
            </div>
        `
            : ""
        }
    `;

    this.imaginaryStatsElement.innerHTML = html;

    const total = Object.values(this.imaginaryPokemon.stats).reduce(
      (sum, value) => sum + value,
      0
    );
    this.totalStatsElement.textContent = total;
  }

  calculateBestPossibleCombination() {
    // Crear una lista de todas las posibilidades para cada estadística
    let statPossibilities = [];
    let bestSourcePossibilities = [];

    console.log(this.shownPokemon);

    this.shownPokemon.forEach((round, roundIndex) => {
      statPossibilities[roundIndex] = [0, 0, 0, 0, 0, 0];
      bestSourcePossibilities[roundIndex] = [];
      round.forEach((pokemon) => {
        if (statPossibilities[roundIndex][0] < pokemon.stats.hp) {
          statPossibilities[roundIndex][0] = pokemon.stats.hp;
          bestSourcePossibilities[roundIndex][0] = pokemon;
        }
        if (statPossibilities[roundIndex][1] < pokemon.stats.attack) {
          statPossibilities[roundIndex][1] = pokemon.stats.attack;
          bestSourcePossibilities[roundIndex][1] = pokemon;
        }
        if (statPossibilities[roundIndex][2] < pokemon.stats.defense) {
          statPossibilities[roundIndex][2] = pokemon.stats.defense;
          bestSourcePossibilities[roundIndex][2] = pokemon;
        }
        if (
          statPossibilities[roundIndex][3] < pokemon.stats["special-attack"]
        ) {
          statPossibilities[roundIndex][3] = pokemon.stats["special-attack"];
          bestSourcePossibilities[roundIndex][3] = pokemon;
        }
        if (
          statPossibilities[roundIndex][4] < pokemon.stats["special-defense"]
        ) {
          statPossibilities[roundIndex][4] = pokemon.stats["special-defense"];
          bestSourcePossibilities[roundIndex][4] = pokemon;
        }
        if (statPossibilities[roundIndex][5] < pokemon.stats.speed) {
          statPossibilities[roundIndex][5] = pokemon.stats.speed;
          bestSourcePossibilities[roundIndex][5] = pokemon;
        }
      });
    });

    let best = {
      stats: {},
      sources: {},
      total: 0,
    };

    best = this.calcularMejorTotal(statPossibilities, bestSourcePossibilities);

    return {
      stats: best.stats,
      sources: best.sources,
      total: best.total,
    };
  }

  calcularMejorTotal(statsPosibles, sourcesPosibles) {
    const combinations = [];

    for (let i = 0; i < statsPosibles.length; i++) {
      for (let j = 0; j < statsPosibles[i].length; j++) {
        if (j == i) {
          continue;
        }
        for (let k = 0; k < statsPosibles[i].length; k++) {
          if (k == i || k == j) {
            continue;
          }
          for (let l = 0; l < statsPosibles[i].length; l++) {
            if (l == i || l == j || l == k) {
              continue;
            }
            for (let m = 0; m < statsPosibles[i].length; m++) {
              if (m == i || m == j || m == k || m == l) {
                continue;
              }
              for (let n = 0; n < statsPosibles[i].length; n++) {
                if (n == i || n == j || n == k || n == l || n == m) {
                  continue;
                }
                combinations.push({
                  stats: {
                    hp: statsPosibles[i][0],
                    attack: statsPosibles[j][1],
                    defense: statsPosibles[k][2],
                    "special-attack": statsPosibles[l][3],
                    "special-defense": statsPosibles[m][4],
                    speed: statsPosibles[n][5],
                  },
                  sources: {
                    hp: sourcesPosibles[i][0],
                    attack: sourcesPosibles[j][1],
                    defense: sourcesPosibles[k][2],
                    "special-attack": sourcesPosibles[l][3],
                    "special-defense": sourcesPosibles[m][4],
                    speed: sourcesPosibles[n][5],
                  },
                  total:
                    statsPosibles[i][0] +
                    statsPosibles[j][1] +
                    statsPosibles[k][2] +
                    statsPosibles[l][3] +
                    statsPosibles[m][4] +
                    statsPosibles[n][5],
                });
              }
            }
          }
        }
      }
    }

    console.log(combinations.sort((a, b) => b.total - a.total)[0]);
    return combinations.sort((a, b) => b.total - a.total)[0];
  }

  showFinalResults() {
    const modal = document.getElementById("results-modal");
    const modalSprite = document.querySelector(".modal-sprite");
    const modalStats = document.querySelector(".modal-stats");
    const modalTotal = document.querySelector(".modal-total");

    // Calcular el total del usuario
    const userTotal = Object.values(this.imaginaryPokemon.stats).reduce(
      (sum, value) => sum + value,
      0
    );

    // Calcular la mejor combinación posible
    const bestPossible = this.calculateBestPossibleCombination();

    // Guardar en el historial
    const historyEntry = {
      id: Date.now(),
      name: this.imaginaryPokemon.name,
      stats: { ...this.imaginaryPokemon.stats },
      sprites: { ...this.imaginaryPokemon.sprites },
      currentSprite: this.imaginaryPokemon.currentSprite,
      total: userTotal,
      date: new Date().toLocaleString(),
    };

    // Inicializar el historial si no existe
    if (!Array.isArray(this.pokemonHistory)) {
      this.pokemonHistory = [];
    }

    this.pokemonHistory.unshift(historyEntry);

    // Guardar en localStorage
    try {
      localStorage.setItem(
        "pokemonHistory",
        JSON.stringify(this.pokemonHistory)
      );
    } catch (error) {
      console.error("Error al guardar el historial:", error);
    }

    this.updateHistoryDisplay();

    // Limpiar estadísticas anteriores
    if (modalStats) {
      modalStats.innerHTML = `
            <div class="results-comparison">
                <div class="user-results">
                    <h3>Tu Pokémon</h3>
                    <div class="stats-container">
                        ${Object.entries(this.imaginaryPokemon.stats)
                          .map(([stat, value]) => {
                            const percentage = (value / 255) * 100;
                            return `
                                <div class="stat-bar">
                                    <div class="stat-name">${this.statNames[stat]}</div>
                                    <div class="stat-progress">
                                        <div class="progress-bar" style="width: ${percentage}%"></div>
                                        <span class="stat-value">${value}</span>
                                    </div>
                                </div>
                            `;
                          })
                          .join("")}
                        <div class="total-value">Total: ${userTotal}</div>
                    </div>
                </div>
                <div class="best-possible">
                    <h3>Mejor Combinación Posible</h3>
                    <div class="stats-container">
                        ${Object.entries(bestPossible.stats)
                          .map(([stat, value]) => {
                            const percentage = (value / 255) * 100;
                            const source = bestPossible.sources[stat];
                            return `
                                <div class="stat-bar">
                                    <div class="stat-name">
                                        ${this.statNames[stat]}
                                        <span class="stat-source">
                                            <img src="${source.sprite}" alt="${
                              source.name
                            }" title="${this.capitalize(source.name)} (Ronda ${
                              source.round
                            })">
                                        </span>
                                    </div>
                                    <div class="stat-progress">
                                        <div class="progress-bar" style="width: ${percentage}%"></div>
                                        <span class="stat-value">${value}</span>
                                    </div>
                                </div>
                            `;
                          })
                          .join("")}
                        <div class="total-value">Total: ${
                          bestPossible.total
                        }</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Mostrar sprite del último Pokémon
    if (modalSprite) {
      const lastSprite = this.imaginaryPokemon.currentSprite;
      if (lastSprite) {
        modalSprite.innerHTML = `<img src="${lastSprite}" alt="Pokémon Imaginario" loading="lazy">`;
      } else {
        modalSprite.innerHTML = '<div class="placeholder-sprite">?</div>';
      }
    }

    // Mostrar total
    if (modalTotal) {
      modalTotal.textContent = `Total: ${userTotal}`;
    }

    // Mostrar modal
    if (modal) {
      modal.classList.add("show");

      // Configurar eventos
      const closeButton = document.querySelector(".close-modal");
      const newPokemonButton = document.querySelector(".modal-button");

      if (closeButton) {
        closeButton.onclick = () => {
          modal.classList.remove("show");
        };
      }

      if (newPokemonButton) {
        newPokemonButton.onclick = () => {
          modal.classList.remove("show");
          this.resetGame();
        };
      }

      // Cerrar modal al hacer clic fuera
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.classList.remove("show");
        }
      };
    }
  }

  resetGame() {
    // Limpiar selecciones
    this.selectedStats.clear();
    this.availableStats = [
      "hp",
      "attack",
      "defense",
      "special-attack",
      "special-defense",
      "speed",
    ];

    // Reiniciar el Pokémon imaginario
    this.imaginaryPokemon = {
      name: "Pokémon Imaginario",
      stats: {},
      sprites: {},
      currentSprite: null,
    };

    // Limpiar elementos del DOM
    this.pokemonListElement.innerHTML = "";
    this.imaginaryStatsElement.innerHTML = "";
    this.totalStatsElement.textContent = "0";
    this.roundNumberElement.textContent = "1";

    // Reiniciar variables de selección
    this.currentPokemon = null;
    this.selectedPokemonElement = null;
    this.selectedStatElement = null;

    this.shownPokemon = [];
    // Iniciar nueva ronda
    this.startNewRound();
  }

  updateHistoryDisplay() {
    if (!this.historyListElement) return;

    this.historyListElement.innerHTML = (this.pokemonHistory || [])
      .map((entry) => {
        // Verificar que entry tenga todas las propiedades necesarias
        if (!entry || !entry.stats || !entry.sprites) return "";

        return `
          <div class="history-card">
              ${
                entry.currentSprite
                  ? `
                  <div class="history-sprite">
                      <img src="${entry.currentSprite}" alt="${entry.name}" loading="lazy">
                  </div>
              `
                  : ""
              }
              <h3>${entry.name || "Pokémon Imaginario"}</h3>
              <div class="history-stats">
                  ${Object.entries(entry.stats)
                    .filter(
                      ([stat, value]) =>
                        stat && value !== undefined && entry.sprites[stat]
                    )
                    .map(
                      ([stat, value]) => `
                          <div class="history-stat">
                              ${
                                entry.sprites[stat]
                                  ? `
                                  <img src="${entry.sprites[stat]}" alt="" class="stat-origin-sprite">
                              `
                                  : ""
                              }
                              ${this.statNames[stat] || stat}: ${value}
                          </div>
                      `
                    )
                    .join("")}
              </div>
              <div class="history-total">
                  Total: ${
                    entry.total ||
                    Object.values(entry.stats).reduce(
                      (sum, val) => sum + val,
                      0
                    )
                  }
              </div>
              <div class="history-date">
                  Creado: ${entry.date || new Date().toLocaleString()}
              </div>
          </div>
        `;
      })
      .filter((html) => html) // Eliminar entradas vacías
      .join("");
  }

  getRandomPokemon(array, count) {
    const shuffled = array.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}

// Iniciar el juego cuando se carga la página
window.addEventListener("load", () => {
  new PokemonGame();
});
