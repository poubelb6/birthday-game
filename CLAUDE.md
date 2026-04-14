# CLAUDE.md — Model Router Project

## Vue d'ensemble

Ce projet implémente un système de routage dynamique qui sélectionne automatiquement
le modèle Anthropic le plus adapté selon la **phase** de la tâche en cours.

---

## Philosophie de routage

Le routage repose sur trois phases distinctes et séquentielles :

```
Tâche entrante
     │
     ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  RÉFLEXION  │ ──▶ │  EXÉCUTION   │ ──▶ │   RÉPONSE   │
│    Opus     │     │   Sonnet     │     │    Haiku    │
└─────────────┘     └──────────────┘     └─────────────┘
```

> **Règle fondamentale** : chaque phase a un modèle dédié. Ne jamais mélanger les rôles.

---

## Modèles & Phases

### 🔵 Phase 1 — Réflexion · `claude-opus-4-5`

Opus intervient **avant** toute exécution. Son rôle est de raisonner, planifier et décider.

**Déclencher Opus quand :**
- La tâche est ambiguë ou nécessite une analyse préalable
- Il faut choisir entre plusieurs approches
- La décision a un impact critique (architecture, sécurité, performance)
- Une synthèse multi-sources est requise
- Le coût d'une erreur d'exécution est élevé

**Opus ne produit pas de code final** — il produit un plan, une décision, ou une spécification.

---

### 🟡 Phase 2 — Exécution · `claude-sonnet-4-5`

Sonnet intervient **après** la réflexion pour implémenter, transformer ou traiter.

**Déclencher Sonnet quand :**
- Le plan est défini et la tâche est claire
- Génération de code (fonctions, classes, tests)
- Refactoring ou débogage de complexité modérée
- Analyse de texte ou traitement de données structurées
- Raisonnement en plusieurs étapes sans ambiguïté majeure

**Sonnet ne repart pas de zéro** — il s'appuie sur la sortie d'Opus ou sur un contexte clair.

---

### 🟢 Phase 3 — Réponse · `claude-haiku-4-5`

Haiku intervient pour toutes les interactions **légères et directes**, sans raisonnement profond.

**Déclencher Haiku quand :**
- Question fermée ou factuelle simple
- Résumé court, reformulation, traduction
- Extraction de données (JSON, CSV) sur format connu
- Classification ou catégorisation binaire
- Réponse FAQ, confirmation, message d'état

**Haiku ne réfléchit pas** — il répond vite et à faible coût.

---

## Règles de comportement pour Claude Code

### Ce que Claude Code DOIT faire

- Identifier la phase courante avant de choisir un modèle
- Documenter le choix de modèle dans le code avec un commentaire explicite
- Centraliser les constantes de modèles dans un fichier dédié (`models.ts` / `config.py`)
- Logger chaque décision de routage pour faciliter le débogage
- Tester chaque route avec des cas limites

### Ce que Claude Code NE DOIT PAS faire

- Coder en dur un modèle sans justification commentée
- Utiliser Opus pour l'exécution — c'est du gaspillage
- Utiliser Haiku pour la réflexion — c'est risqué
- Mélanger logique métier et logique de routage dans la même fonction
- Ignorer les erreurs de quota ou de rate limit — les gérer explicitement
- Introduire un nouveau modèle sans mettre à jour ce fichier et les tests

---

## Conventions de code

```
MODEL_HAIKU   = "claude-haiku-4-5"
MODEL_SONNET  = "claude-sonnet-4-5"
MODEL_OPUS    = "claude-opus-4-5"
```

- Les constantes sont définies **une seule fois** dans `models.ts` ou `config.py`
- Les fonctions de routage retournent une **string** (nom du modèle), pas un objet
- Chaque appel API inclut un champ `phase` dans les métadonnées de log (`reflection` / `execution` / `response`)

---

## Arbre de décision rapide

```
La tâche est-elle simple et directe ?
├── Oui  →  Haiku
└── Non  →  Le plan est-il déjà défini ?
            ├── Oui  →  Sonnet
            └── Non  →  Opus  (puis Sonnet pour l'exécution)
```

---

## Références

- [Modèles Anthropic](https://docs.anthropic.com/en/docs/about-claude/models/overview)
- [Tarification](https://www.anthropic.com/pricing)
- [Claude Code — Mémoire & CLAUDE.md](https://code.claude.com/docs/en/memory)
