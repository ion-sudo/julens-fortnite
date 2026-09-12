/**
 * inventory.js
 * ---------------------------------------------------------------
 * INVENTARIO de 6 ranuras, como el de Fortnite:
 *
 *   Ranura 0 -> el PICO. Siempre esta ahi y no se puede soltar. Tecla F.
 *   Ranuras 1..5 -> armas, curas, granadas y trastos (torretas y
 *                   trampas) que vas recogiendo. Teclas 1..5.
 *
 * Solo guarda y organiza objetos; no sabe disparar ni curar (de eso se
 * encargan systems/combat.js y el propio jugador).
 */

/** Numero total de ranuras (1 pico + 5 objetos). */
export const SLOT_COUNT = 6;
/** Indice de la ranura del pico. */
export const PICKAXE_SLOT = 0;

export class Inventory {
  /** @param {object} pickaxeCosmetic definicion del pico equipado en la taquilla */
  constructor(pickaxeCosmetic) {
    /** @type {Array<object|null>} */
    this.slots = new Array(SLOT_COUNT).fill(null);

    // La ranura 0 lleva siempre el pico, con el aspecto elegido en la taquilla.
    this.slots[PICKAXE_SLOT] = {
      kind: 'pickaxe',
      cosmetic: pickaxeCosmetic,
      name: pickaxeCosmetic?.name || 'Pico',
      rarity: pickaxeCosmetic?.rarity || 'common',
    };

    this.selected = PICKAXE_SLOT;
  }

  /* =============================================================
     CONSULTAS
     ============================================================= */

  /** Objeto que lleva ahora mismo en la mano. */
  get equipped() {
    return this.slots[this.selected];
  }

  /** ¿Lo que lleva en la mano es el pico? */
  get holdingPickaxe() {
    return this.selected === PICKAXE_SLOT;
  }

  /** Primera ranura libre de las de objetos (1..5), o -1 si estan llenas. */
  firstFreeSlot() {
    for (let i = PICKAXE_SLOT + 1; i < SLOT_COUNT; i++) {
      if (!this.slots[i]) return i;
    }
    return -1;
  }

  /** ¿Hay hueco para un objeto mas? */
  get hasSpace() {
    return this.firstFreeSlot() !== -1;
  }

/** Tipos de objeto que se APILAN en una misma ranura. */
  static get STACKABLE() { return ['heal', 'throwable', 'gadget']; }

  /**
   * Busca una ranura con el MISMO objeto apilable para meterlo encima.
   * Vale para curas y para granadas: las dos llevan `count` y `def.stack`.
   * @returns {number} indice, o -1 si no hay ninguna con sitio
   */
  findStackable(item) {
    if (!Inventory.STACKABLE.includes(item.kind)) return -1;
    for (let i = PICKAXE_SLOT + 1; i < SLOT_COUNT; i++) {
      const slot = this.slots[i];
      if (slot?.kind === item.kind && slot.def.id === item.def.id &&
          slot.count < slot.def.stack) {
        return i;
      }
    }
    return -1;
  }

  /* =============================================================
     ACCIONES
     ============================================================= */

  /** Selecciona una ranura (ignora indices fuera de rango). */
  select(index) {
    if (index < 0 || index >= SLOT_COUNT) return false;
    this.selected = index;
    return true;
  }

  /**
   * Mete un objeto en el inventario.
   * Primero intenta apilar curas iguales, luego usa la primera ranura libre.
   * @returns {{ok: boolean, slot?: number, stacked?: boolean, reason?: string}}
   */
  add(item) {
    // 1) Apilar curas del mismo tipo
    const stackSlot = this.findStackable(item);
    if (stackSlot !== -1) {
      const slot = this.slots[stackSlot];
      const hueco = slot.def.stack - slot.count;
      const mete = Math.min(hueco, item.count ?? 1);
      slot.count += mete;

      const sobra = (item.count ?? 1) - mete;
      if (sobra > 0) {
        // Lo que no cabe intenta ir a una ranura libre
        item.count = sobra;
        const libre = this.firstFreeSlot();
        if (libre === -1) return { ok: true, slot: stackSlot, stacked: true, leftover: sobra };
        this.slots[libre] = item;
        return { ok: true, slot: libre };
      }
      return { ok: true, slot: stackSlot, stacked: true };
    }

    // 2) Ranura libre
    const libre = this.firstFreeSlot();
    if (libre === -1) return { ok: false, reason: 'Inventario lleno' };

    this.slots[libre] = item;
    return { ok: true, slot: libre };
  }

  /**
   * Coloca un objeto en una ranura concreta y devuelve lo que hubiera antes.
   * Se usa al intercambiar con el inventario lleno.
   * @returns {object|null} el objeto que estaba antes
   */
  replace(index, item) {
    if (index <= PICKAXE_SLOT || index >= SLOT_COUNT) return null;
    const anterior = this.slots[index];
    this.slots[index] = item;
    return anterior;
  }

  /**
   * Saca de la ranura equipada lo que lleve (tecla R).
   * El pico nunca se suelta.
   * @returns {object|null} el objeto soltado
   */
  dropEquipped() {
    if (this.holdingPickaxe) return null;

    const item = this.slots[this.selected];
    if (!item) return null;

    this.slots[this.selected] = null;
    return item;
  }

  /**
   * Descuenta una unidad de lo equipado (una cura al terminar de usarla,
   * una granada al lanzarla). Si se acaba, la ranura queda vacia.
   */
  consumeEquipped() {
    const item = this.equipped;
    if (!item || !Inventory.STACKABLE.includes(item.kind)) return;

    item.count -= 1;
    if (item.count <= 0) this.slots[this.selected] = null;
  }
}
