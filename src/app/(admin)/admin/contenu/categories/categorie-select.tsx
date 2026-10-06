/** Le choix de catégorie des formulaires d'article et de guide. */
export function CategorieSelect({
  categories,
  defaultValue,
}: {
  categories: string[];
  defaultValue: string;
}) {
  return (
    <div>
      <label htmlFor="category" className="block text-[12px] font-medium text-ink mb-1.5">
        Catégorie <span className="text-warm-grey font-normal">(optionnel)</span>
      </label>
      <select
        id="category"
        name="category"
        defaultValue={defaultValue}
        className="w-full h-10 px-3 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors cursor-pointer"
      >
        <option value="">Sans catégorie</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <p className="text-[11.5px] text-warm-grey mt-1">
        La liste se gère dans « Catégories », en haut de la liste.
      </p>
    </div>
  );
}
