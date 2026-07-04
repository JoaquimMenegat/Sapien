/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // UI/utilitário: grotesca limpa. Display/títulos: serifada literária (Lora).
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
        serif: ['Lora', 'Georgia', 'Cambria', 'Times New Roman', 'serif']
      },
      colors: {
        // Paleta "Humanist Literary" (estética Claude): papel quente, tinta suave,
        // um único acento de argila/terracota. Modo escuro também é quente, não frio.
        canvas: {
          light: '#faf9f6', // papel eggshell
          dark: '#1a1917' // carvão quente
        },
        surface: {
          light: '#f2f0eb', // fundos secundários / chips
          dark: '#24221e'
        },
        edge: {
          light: '#e8e6e0', // bordas delicadas e quentes
          dark: '#34312b'
        },
        ink: {
          DEFAULT: '#383838', // tinta principal (claro)
          soft: '#6b6960', // descrições, timestamps
          faint: '#9a968b', // texto mais apagado
          dark: '#ece9e2' // tinta principal (escuro)
        },
        clay: {
          DEFAULT: '#da7756', // acento primário (ações de submit)
          hover: '#c96544',
          soft: '#f4e6df'
        }
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem'
      }
    }
  },
  plugins: []
}
