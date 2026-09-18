# Rapport PFE Droppy — Guide LaTeX / Overleaf

## Contenu du package

```
rapport-pfe-droppy/
├── main.tex                 # Document principal LaTeX
├── chapters/                # Chapitres (01 à 09 + annexes)
├── diagrams/                # Sources PlantUML (.puml)
├── images/                  # Images générées (PNG/PDF)
├── generate-diagrams.bat    # Script génération diagrammes
└── README.md                # Ce fichier
```

## Utilisation sur Overleaf

1. **Créer un nouveau projet** sur [Overleaf](https://www.overleaf.com)
2. **Importer le ZIP** : Menu → New Project → Upload Project → sélectionner `rapport-pfe-droppy.zip`
3. **Compiler** : cliquer sur « Recompile » (pdfLaTeX)
4. **Personnaliser** la page de garde dans `main.tex` (nom, encadrants, établissement)

## Génération des diagrammes UML

Les diagrammes PlantUML doivent être convertis en images PNG pour apparaître dans le PDF.

### Option A — Script automatique (Windows)

```cmd
generate-diagrams.bat
```

Prérequis : Java JDK + fichier `plantuml.jar` (téléchargé automatiquement si absent).

### Option B — PlantUML en ligne

1. Ouvrir https://www.plantuml.com/plantuml
2. Copier le contenu de chaque fichier `.puml` du dossier `diagrams/`
3. Télécharger le PNG généré
4. Placer les fichiers dans `images/` avec les noms :
   - `usecase.png`
   - `class_diagram.png`
   - `sequence_scheduled.png`
   - `sequence_validate.png`
   - `sequence_train.png`
   - `sequence_get.png`

### Option C — Extension VS Code

Installer l'extension « PlantUML » et exporter chaque `.puml` en PNG.

## Compilation locale

```bash
pdflatex main.tex
pdflatex main.tex   # 2e passe pour la table des matières
```

Ou avec latexmk :

```bash
latexmk -pdf main.tex
```

## Personnalisation

| Élément | Fichier |
|---------|---------|
| Page de garde | `main.tex` (section titlepage) |
| Contenu chapitres | `chapters/*.tex` |
| Diagrammes UML | `diagrams/*.puml` |
| Bibliographie | `main.tex` (section thebibliography) |

## Compilateur recommandé

- **Overleaf** : pdfLaTeX (par défaut)
- **Local** : TeX Live ou MiKTeX avec packages `babel-french`, `geometry`, `hyperref`, `listings`, `booktabs`, `longtable`, `fancyhdr`

## Note

Si les images UML ne sont pas générées, le document compile quand même avec des placeholders indiquant les fichiers manquants. Les sources PlantUML sont incluses en annexe.
