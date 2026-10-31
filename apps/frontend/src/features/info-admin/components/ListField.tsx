import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { useRef } from 'react'

type ListFieldProps = {
  id: string
  label: string
  hint?: string
  items: string[]
  onChange: (items: string[]) => void
  disabled?: boolean
}

// Isian daftar yang bisa ditambah terus: satu input per butir, dengan tombol
// naik/turun dan hapus. Butir kosong dibuang saat disimpan (backend).
export function ListField({ id, label, hint, items, onChange, disabled }: ListFieldProps) {
  const listRef = useRef<HTMLOListElement>(null)

  const update = (index: number, value: string) =>
    onChange(items.map((item, i) => (i === index ? value : item)))
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index))
  const move = (index: number, offset: number) => {
    const next = [...items]
    ;[next[index], next[index + offset]] = [next[index + offset], next[index]]
    onChange(next)
  }

  const add = () => {
    onChange([...items, ''])
    // Fokus ke butir baru setelah dirender.
    requestAnimationFrame(() =>
      listRef.current?.querySelector<HTMLInputElement>('li:last-child input')?.focus(),
    )
  }

  const iconButton =
    'inline-flex size-10 flex-none items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-[#185fa5] hover:text-[#185fa5] disabled:opacity-40'

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" disabled={disabled}>
      <legend className="mb-1 text-sm font-semibold text-gray-800">{label}</legend>
      {hint && (
        <p id={`${id}-hint`} className="m-0 text-xs text-gray-500">
          {hint}
        </p>
      )}

      {items.length > 0 && (
        <ol ref={listRef} className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-1.5">
              <span className="w-6 flex-none text-right text-sm text-gray-500" aria-hidden="true">
                {index + 1}.
              </span>
              <input
                type="text"
                value={item}
                maxLength={300}
                onChange={(event) => update(index, event.target.value)}
                aria-label={`${label}, butir ${index + 1}`}
                aria-describedby={hint ? `${id}-hint` : undefined}
                className="h-10 min-w-0 flex-1 rounded-lg border border-gray-300 px-3 text-sm"
              />
              <button
                type="button"
                className={iconButton}
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Naikkan butir ${index + 1}`}
              >
                <ArrowUp size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={iconButton}
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                aria-label={`Turunkan butir ${index + 1}`}
              >
                <ArrowDown size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={iconButton}
                onClick={() => remove(index)}
                aria-label={`Hapus butir ${index + 1}`}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        onClick={add}
        className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-lg border border-dashed border-gray-400 bg-white px-3.5 text-sm font-semibold text-[#185fa5] hover:border-[#185fa5]"
      >
        <Plus size={16} aria-hidden="true" />
        Tambah butir
      </button>
    </fieldset>
  )
}
