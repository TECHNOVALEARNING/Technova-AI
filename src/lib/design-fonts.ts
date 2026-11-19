// Fonts and emojis of TechNova Design. Every font is free to use, embed and print, commercial use included
// (Google Fonts, SIL Open Font License or Apache 2.0); emojis are Unicode characters drawn with Noto Color Emoji
// (SIL OFL), so a design looks the same on every computer and in the PDF.

export type DesignFont = { name: string; group: "sans" | "serif" | "display" | "script"; weights?: string };

export const DESIGN_FONTS: DesignFont[] = [
  { name: "Inter", group: "sans", weights: "400;500;600;700" }, { name: "Manrope", group: "sans", weights: "400;600;800" },
  { name: "Plus Jakarta Sans", group: "sans", weights: "400;600;800" }, { name: "DM Sans", group: "sans", weights: "400;500;700" },
  { name: "Poppins", group: "sans", weights: "400;600;700" }, { name: "Montserrat", group: "sans", weights: "400;600;800" },
  { name: "Lato", group: "sans", weights: "400;700" }, { name: "Open Sans", group: "sans", weights: "400;700" },
  { name: "Roboto", group: "sans", weights: "400;700" }, { name: "Nunito", group: "sans", weights: "400;700" },
  { name: "Raleway", group: "sans", weights: "400;700" }, { name: "Work Sans", group: "sans", weights: "400;700" },
  { name: "Outfit", group: "sans", weights: "400;700" }, { name: "Sora", group: "sans", weights: "400;700" },
  { name: "Space Grotesk", group: "sans", weights: "400;700" }, { name: "Rubik", group: "sans", weights: "400;700" },
  { name: "Fraunces", group: "serif", weights: "400;500;600;700" }, { name: "Playfair Display", group: "serif", weights: "400;500;600;700" },
  { name: "Lora", group: "serif", weights: "400;700" }, { name: "Merriweather", group: "serif", weights: "400;700" },
  { name: "Cormorant Garamond", group: "serif", weights: "400;600;700" }, { name: "EB Garamond", group: "serif", weights: "400;700" },
  { name: "Libre Baskerville", group: "serif", weights: "400;700" }, { name: "DM Serif Display", group: "serif" },
  { name: "Bebas Neue", group: "display" }, { name: "Oswald", group: "display", weights: "400;700" }, { name: "Abril Fatface", group: "display" },
  { name: "Dancing Script", group: "script", weights: "400;700" }, { name: "Great Vibes", group: "script" }, { name: "Pacifico", group: "script" },
  { name: "Caveat", group: "script", weights: "400;700" }, { name: "Satisfy", group: "script" },
];

export const FONT_GROUPS: Record<DesignFont["group"], { fr: string; en: string }> = {
  sans: { fr: "Modernes", en: "Modern" }, serif: { fr: "Élégantes", en: "Elegant" }, display: { fr: "Titres", en: "Headlines" }, script: { fr: "Manuscrites", en: "Script" },
};

/** One Google Fonts stylesheet for every design font plus Noto Color Emoji (files load only when used). */
export const DESIGN_FONTS_HREF = `https://fonts.googleapis.com/css2?${[...DESIGN_FONTS.map((f) => `family=${f.name.replace(/ /g, "+")}${f.weights ? `:wght@${f.weights}` : ""}`), "family=Noto+Color+Emoji"].join("&")}&display=swap`;

/** Emoji picker, by theme (Unicode characters, free to use). */
export const EMOJI_GROUPS: { fr: string; en: string; list: string }[] = [
  { fr: "Fête", en: "Party", list: "🎉 🎊 🥳 🎂 🍰 🎁 🎈 🎀 🥂 🍾 💍 💐 🌹 🌸 🌺 🕊️ 💒 👰 🤵 💃 🕺 🎶 🎵 🎤 🎆 🎇 ✨ 🌟 ⭐ 💫" },
  { fr: "Cœurs", en: "Hearts", list: "❤️ 🧡 💛 💚 💙 💜 🤍 🤎 🖤 💖 💗 💓 💕 💞 💘 💝 😍 🥰 😘 🤗" },
  { fr: "Travail", en: "Work", list: "💼 📊 📈 📉 📌 📍 📎 📝 ✏️ 🖊️ 📅 🗓️ ⏰ 💡 🎯 🚀 🏆 🥇 ✅ ☑️ ✔️ ❗ ❓ ⚠️ 🔒 🔑 📣 📢 💬 🤝" },
  { fr: "Contact", en: "Contact", list: "📞 ☎️ 📱 📧 ✉️ 📨 🌐 🏠 🏢 🏫 🏥 🏪 🛒 🛍️ 💳 💰 💵 🧾 🚗 🚕 🛵 ✈️ 🗺️ 🧭" },
  { fr: "Visages", en: "Faces", list: "😀 😃 😄 😁 😊 🙂 😉 😎 🤩 🥳 😇 🤔 🙌 👏 👍 👌 ✌️ 🙏 💪 👋 👀 🔥 💯" },
  { fr: "Nature et cuisine", en: "Nature & food", list: "🌍 🌞 🌤️ 🌈 🌊 🌴 🌳 🍃 🌾 🌻 🍀 🍎 🍊 🍋 🍉 🍍 🥥 🥑 🍞 🍗 🍲 🍛 🍜 ☕ 🍵 🧃 🍷" },
  { fr: "Symboles", en: "Symbols", list: "➡️ ⬅️ ⬆️ ⬇️ ↗️ 🔹 🔸 🔺 🔻 ⚫ ⚪ 🟢 🟡 🟠 🔴 🟣 🔵 ▪️ ▫️ ◆ ◇ ● ○ ★ ☆ ✦ ✧ ❖ ✳️ ➕ ➖" },
];
