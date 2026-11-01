"use client";

import { ChevronDown } from "lucide-react";
import { FIFA_EDITIONS, EDITION_LIST, FifaEdition } from "@/lib/fifa-editions";

type Props = {
  selectedEdition: FifaEdition;
  onSelectEdition: (edition: FifaEdition) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
};

export default function EditionSelector({
  selectedEdition,
  onSelectEdition,
  isOpen,
  onToggleOpen,
}: Props) {
  const current = FIFA_EDITIONS[selectedEdition] || FIFA_EDITIONS.ALL;

  return (
    <div className="relative w-full my-3">
      <div className="text-[10px] font-mono tracking-wider uppercase text-gray-400 px-3 mb-1.5 flex items-center justify-between">
        <span>Saison FIFA / FC</span>
        <span
          className="text-[9px] px-1.5 py-0.2 rounded font-bold"
          style={{ background: `${current.heroColor}25`, color: current.heroColor }}
        >
          {current.badge}
        </span>
      </div>

      <button
        onClick={onToggleOpen}
        type="button"
        className="w-full flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 group text-left cursor-pointer"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex flex-col items-center justify-center font-black transition group-hover:scale-105 shadow-md"
            style={{
              background: current.heroColor,
              color: "#080c10",
            }}
          >
            <span className="text-[10px] leading-tight font-extrabold tracking-tighter">
              {current.logoText.prefix}
            </span>
            <span className="text-[12px] leading-none font-black tracking-tighter">
              {current.logoText.suffix}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white group-hover:text-amber-300 transition">
                {current.name}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 block font-mono">
              {current.year}
            </span>
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border backdrop-blur-2xl p-2 shadow-2xl flex flex-col gap-1 max-h-80 overflow-y-auto"
          style={{
            background: "rgba(12, 18, 25, 0.96)",
            borderColor: "rgba(255, 255, 255, 0.15)",
          }}
        >
          {EDITION_LIST.map((key) => {
            const ed = FIFA_EDITIONS[key];
            const isSelected = selectedEdition === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onSelectEdition(key);
                  onToggleOpen();
                }}
                className={`flex items-center justify-between p-2 rounded-xl transition text-left cursor-pointer ${
                  isSelected ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-md flex flex-col items-center justify-center font-black text-[9px] shadow-sm"
                    style={{
                      background: ed.heroColor,
                      color: "#080c10",
                    }}
                  >
                    <span>{ed.logoText.prefix}</span>
                    <span className="font-bold">{ed.logoText.suffix}</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      {ed.name}
                      {isSelected && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: ed.heroColor }}
                        />
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-gray-400">
                      {ed.year} • {ed.badge}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
