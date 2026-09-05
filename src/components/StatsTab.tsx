import React, { useState, useMemo } from 'react';
import { Client, Produit, Sale, Service, Settings } from '../types';
import { formatNumberAmount, formatIntWithThousands, splitAmountString } from '../utils/format';
import { isSameDay, isSameMonth, isSameWeek } from '../utils/date';
import { ShoppingCart, Package, Wrench, Users, XCircle, ChevronLeft, ChevronRight, BarChart2, Equal } from 'lucide-react';

interface StatsTabProps {
  ventes: Sale[];
  produits: Produit[];
  services: Service[];
  clients: Client[];
  settings: Settings;
}

export const StatsTab: React.FC<StatsTabProps> = ({ ventes, produits, services, clients, settings }) => {
  const [activeSubTab, setActiveSubTab] = useState<'ventes' | 'produits' | 'services'>('ventes');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [mode, setMode] = useState<'MOIS' | 'TOT'>('MOIS');
  const [salesTypeFilter, setSalesTypeFilter] = useState<'ACTIVES' | 'ANNULEES'>('ACTIVES');
  const [graphViewMode, setGraphViewMode] = useState<'barres' | 'chiffres'>('barres');

  // Correct cancelled status check in French application (it is 'annule', not 'cancelled')
  const activeSales = ventes.filter((v) => v.status !== 'annule');
  const cancelledSales = ventes.filter((v) => v.status === 'annule');

  // Group all active sales by local date string to find the all-time maximum single-day amount
  const allTimeMaxDaily = useMemo(() => {
    const dailyTotals: Record<string, number> = {};
    activeSales.forEach(s => {
      const d = new Date(s.createdAt);
      const dateKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      const amt = parseFloat((s.totalAmount || '0').replace(/\s/g, '').replace(',', '.'));
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + amt;
    });
    const totals = Object.values(dailyTotals);
    return totals.length > 0 ? Math.max(...totals, 1) : 1;
  }, [activeSales]);

  const tabs = [
    { id: 'ventes', icon: ShoppingCart },
    { id: 'produits', icon: Package },
    { id: 'services', icon: Wrench },
  ] as const;

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const monthStr = selectedMonth.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }).replace('.', '');
  const displayMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);

  const MergedKpiCard = () => {
    const today = new Date();
    
    let activeAujd = 0, activeHebd = 0, activeMois = 0, activeTot = 0;
    activeSales.forEach(s => {
      const d = new Date(s.createdAt);
      const amt = parseFloat((s.totalAmount || '0').replace(/\s/g, '').replace(',', '.'));
      if (isSameDay(d, today)) activeAujd += amt;
      if (isSameWeek(d, today)) activeHebd += amt;
      if (isSameMonth(d, today)) activeMois += amt;
      activeTot += amt;
    });

    let cancelAujd = 0, cancelHebd = 0, cancelMois = 0, cancelTot = 0;
    cancelledSales.forEach(s => {
      const d = new Date(s.createdAt);
      const amt = parseFloat((s.totalAmount || '0').replace(/\s/g, '').replace(',', '.'));
      if (isSameDay(d, today)) cancelAujd += amt;
      if (isSameWeek(d, today)) cancelHebd += amt;
      if (isSameMonth(d, today)) cancelMois += amt;
      cancelTot += amt;
    });

    const formatVal = (val: number, isRed: boolean) => {
      if (val === 0) {
        return <span className={isRed ? 'text-rose-600 font-bold' : 'text-[#000000] font-bold'}>-</span>;
      }
      const formatted = formatNumberAmount(val, settings.decimalMode);
      const parts = splitAmountString(formatted, settings.decimalMode);
      return (
        <span className={isRed ? 'text-rose-600 font-bold' : 'text-[#000000] font-bold'}>
          {parts.intPart}
          {parts.decPart !== undefined && (
            <>
              ,
              <span className="text-[0.75em]">{parts.decPart}</span>
            </>
          )}
        </span>
      );
    };

    const renderKpiBox = (label: string, activeVal: number, cancelVal: number) => {
      return (
        <div className="bg-[#FFFFFF] p-3 flex flex-col gap-1 w-full overflow-hidden">
          <span className="f-app text-neutral-500 text-xs font-bold leading-none">{label}</span>
          <div className="text-left mt-1.5 leading-tight truncate">
            {formatVal(activeVal, false)}
          </div>
          <div className="text-right leading-tight truncate">
            {formatVal(cancelVal, true)}
          </div>
        </div>
      );
    };

    return (
      <div className="bg-[#F0F0F0] p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 text-[#000000]">
            <span className="w-2 h-2 bg-[#000000] rounded-sm shrink-0"></span>
            <span className="f-app font-bold text-sm">Ventes Actives</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-600">
            <span className="w-2 h-2 bg-rose-600 rounded-sm shrink-0"></span>
            <span className="f-app font-bold text-sm">Ventes Annulées</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {renderKpiBox('AUJD', activeAujd, cancelAujd)}
          {renderKpiBox('HEBD', activeHebd, cancelHebd)}
          {renderKpiBox('MOIS', activeMois, cancelMois)}
          {renderKpiBox('TOT', activeTot, cancelTot)}
        </div>
      </div>
    );
  };

  const renderVentes = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    interface GraphItem {
      label: string;
      day: number;
      activeAmount: number;
      cancelledAmount: number;
      dayName: string;
      isNonExistent?: boolean;
    }

    const items: GraphItem[] = [];

    for (let d = 1; d <= 31; d++) {
      const isEx = d <= daysInMonth;
      const dateObj = isEx ? new Date(year, month, d) : null;
      const dayStr = dateObj ? dateObj.toLocaleDateString('fr-FR', { weekday: 'short' }).substring(0, 2).toUpperCase() : '';
      items.push({
        label: d.toString().padStart(2, '0'),
        day: d,
        dayName: dayStr,
        activeAmount: 0,
        cancelledAmount: 0,
        isNonExistent: d > daysInMonth,
      });
    }

    // Populate active sales amounts
    activeSales.forEach(s => {
      const d = new Date(s.createdAt);
      if (isSameMonth(d, selectedMonth)) {
        const dayNum = d.getDate();
        const targetItem = items.find(it => it.day === dayNum);
        if (targetItem) {
          targetItem.activeAmount += parseFloat((s.totalAmount || '0').replace(/\s/g, '').replace(',', '.'));
        }
      }
    });

    // Populate cancelled sales amounts
    cancelledSales.forEach(s => {
      const d = new Date(s.createdAt);
      if (isSameMonth(d, selectedMonth)) {
        const dayNum = d.getDate();
        const targetItem = items.find(it => it.day === dayNum);
        if (targetItem) {
          targetItem.cancelledAmount += parseFloat((s.totalAmount || '0').replace(/\s/g, '').replace(',', '.'));
        }
      }
    });

    const maxDailyTotalCombined = Math.max(
      ...items.map(it => Math.max(it.activeAmount, it.cancelledAmount)),
      1
    );

    return (
      <div className="flex flex-col gap-3">
        <MergedKpiCard />

        <div className="border border-neutral-200 rounded flex flex-col">
          <div className="flex items-center justify-between p-2 bg-[#F5F5F5] border-b border-neutral-200 gap-2">
            <button onClick={handlePrevMonth} className="px-8 py-2 cursor-pointer border border-neutral-300 bg-[#FFFFFF] hover:bg-neutral-200 rounded flex items-center justify-center transition-colors text-neutral-700">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="f-app font-bold text-[#000000] capitalize text-center flex-1">{displayMonth}</span>
            <button onClick={handleNextMonth} className="px-8 py-2 cursor-pointer border border-neutral-300 bg-[#FFFFFF] hover:bg-neutral-200 rounded flex items-center justify-center transition-colors text-neutral-700">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-[#FFFFFF] p-1.5 flex flex-col gap-1">
            {(() => {
              const monthActiveTotal = items.reduce((acc, it) => acc + it.activeAmount, 0);
              const monthCancelTotal = items.reduce((acc, it) => acc + it.cancelledAmount, 0);
              const activeFormatted = monthActiveTotal === 0 ? '-' : formatNumberAmount(monthActiveTotal, settings.decimalMode);
              const cancelFormatted = monthCancelTotal === 0 ? '-' : formatNumberAmount(monthCancelTotal, settings.decimalMode);
              
              const monthActiveParts = splitAmountString(activeFormatted, settings.decimalMode);
              const monthCancelParts = splitAmountString(cancelFormatted, settings.decimalMode);

              const GraphViewToggle = () => (
                <button
                  type="button"
                  onClick={() => setGraphViewMode(prev => prev === 'barres' ? 'chiffres' : 'barres')}
                  className="w-14 h-[26px] shrink-0 self-center flex items-center justify-center gap-0.5 bg-[#EAEAEA] hover:bg-[#DCDCDC] border border-neutral-300 rounded cursor-pointer transition-all text-neutral-800"
                  title={graphViewMode === 'barres' ? "Afficher les chiffres" : "Afficher les barres"}
                >
                  <BarChart2 className={`w-3.5 h-3.5 shrink-0 ${graphViewMode === 'barres' ? 'text-[#000000] stroke-[2.5px]' : 'text-neutral-400'}`} />
                  <span className="text-[10px] font-bold text-neutral-400 shrink-0 select-none">/</span>
                  <Equal className={`w-3.5 h-3.5 shrink-0 ${graphViewMode === 'chiffres' ? 'text-[#000000] stroke-[3.5px]' : 'text-neutral-400 stroke-[2.5px]'}`} />
                </button>
              );
              
              return (
                <div className="flex items-stretch w-full gap-2 py-1.5 border-b-2 border-neutral-300 min-h-[32px] bg-neutral-50 px-1 font-bold">
                  <GraphViewToggle />
                  
                  {/* Empty spacer where the bars usually are */}
                  <div className="flex-1 border-l border-neutral-200 pl-2 self-center"></div>

                  <div className="w-32 text-right self-center shrink-0">
                    <span className="f-app text-xs font-bold text-[#000000] block truncate">
                      {monthActiveTotal === 0 ? '-' : (
                        <>
                          {monthActiveParts.intPart}
                          {monthActiveParts.decPart !== undefined && (
                            <>
                              ,
                              <span className="text-[0.75em]">{monthActiveParts.decPart}</span>
                            </>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="w-32 text-right self-center shrink-0">
                    <span className="f-app text-xs font-bold text-rose-600 block truncate">
                      {monthCancelTotal === 0 ? '-' : (
                        <>
                          {monthCancelParts.intPart}
                          {monthCancelParts.decPart !== undefined && (
                            <>
                              ,
                              <span className="text-[0.75em]">{monthCancelParts.decPart}</span>
                            </>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })()}
            {items.map((item, idx) => {
              const activePct = (item.activeAmount / maxDailyTotalCombined) * 100;
              const cancelPct = (item.cancelledAmount / maxDailyTotalCombined) * 100;

              const activeFormatted = item.isNonExistent
                ? ''
                : (item.activeAmount === 0 ? '-' : formatNumberAmount(item.activeAmount, settings.decimalMode));
              const cancelFormatted = item.isNonExistent
                ? ''
                : (item.cancelledAmount === 0 ? '-' : formatNumberAmount(item.cancelledAmount, settings.decimalMode));

              const activeParts = splitAmountString(activeFormatted, settings.decimalMode);
              const cancelParts = splitAmountString(cancelFormatted, settings.decimalMode);

              return (
                <div key={idx} className="flex items-stretch w-full gap-2 py-0.5 border-b border-neutral-100 last:border-b-0 min-h-[24px]">
                  <div className="flex items-center gap-1 w-14 shrink-0 self-center text-xs font-bold text-neutral-600">
                    <span className="w-5 text-left shrink-0">{item.dayName}</span>
                    <span className="w-6 text-left shrink-0">{item.label}</span>
                  </div>
                  
                  {graphViewMode === 'barres' ? (
                    <div className="flex-1 flex flex-col gap-0.5 justify-center border-l border-neutral-200 pl-2 self-center">
                      {/* Active Bar (Black) */}
                      <div className="flex items-center h-2 w-full bg-transparent">
                        {!item.isNonExistent && (
                          <div 
                            className="bg-[#000000] rounded-sm transition-all duration-300 h-full" 
                            style={{ 
                              width: item.activeAmount > 0 ? `${activePct}%` : '4px',
                              minWidth: '4px'
                            }}
                          ></div>
                        )}
                      </div>
                      {/* Canceled Bar (Red) */}
                      <div className="flex items-center h-2 w-full bg-transparent">
                        {!item.isNonExistent && (
                          <div 
                            className="bg-rose-600 rounded-sm transition-all duration-300 h-full" 
                            style={{ 
                              width: item.cancelledAmount > 0 ? `${cancelPct}%` : '4px',
                              minWidth: '4px'
                            }}
                          ></div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Empty spacer where the bars usually are in chiffres mode */}
                      <div className="flex-1 border-l border-neutral-200 pl-2 self-center"></div>

                      {/* Fully separated side-by-side columns for Active and Cancelled amounts */}
                      <div className="w-32 text-right self-center shrink-0">
                        <span className="f-app text-xs font-normal text-[#000000] block truncate">
                          {item.isNonExistent ? '' : (item.activeAmount === 0 ? '-' : (
                            <>
                              {activeParts.intPart}
                              {activeParts.decPart !== undefined && (
                                <>
                                  ,
                                  <span className="text-[0.75em]">{activeParts.decPart}</span>
                                </>
                              )}
                            </>
                          ))}
                        </span>
                      </div>
                      <div className="w-32 text-right self-center shrink-0">
                        <span className="f-app text-xs font-normal text-rose-600 block truncate">
                          {item.isNonExistent ? '' : (item.cancelledAmount === 0 ? '-' : (
                            <>
                              {cancelParts.intPart}
                              {cancelParts.decPart !== undefined && (
                                <>
                                  ,
                                  <span className="text-[0.75em]">{cancelParts.decPart}</span>
                                </>
                              )}
                            </>
                          ))}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderProduits = () => {
    const productStats: Record<string, { code: string; nom: string; ms: string; nbr: number; isArchived: boolean }> = {};
    produits.forEach(p => {
      productStats[p.id] = { code: p.code, nom: p.nom, ms: p.mesure || '', nbr: 0, isArchived: !!p.isArchived };
    });

    const salesSource = salesTypeFilter === 'ACTIVES' ? activeSales : cancelledSales;

    salesSource.forEach(s => {
      const d = new Date(s.createdAt);
      if (mode === 'TOT' || isSameMonth(d, selectedMonth)) {
        s.items.forEach(item => {
          if (item.type === 'produit') {
            const pId = item.itemId;
            const qty = parseFloat(`${item.quantiteInt || '0'}.${item.quantiteDec || '0'}`);
            if (pId && productStats[pId]) {
              productStats[pId].nbr += qty;
            } else {
              const p = produits.find(prod => prod.code === item.code);
              if (p && productStats[p.id]) {
                productStats[p.id].nbr += qty;
              }
            }
          }
        });
      }
    });

    const rows = Object.values(productStats).sort((a, b) => a.code.localeCompare(b.code));

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center bg-[#F0F0F0] rounded p-1 shrink-0">
          <button 
            onClick={() => setMode('MOIS')} 
            className={`flex-1 p-2 text-center f-app font-bold cursor-pointer border-none ${mode === 'MOIS' ? 'bg-[#FFFFFF] text-[#000000] shadow-sm' : 'bg-transparent text-neutral-500 hover:bg-neutral-200'}`}
          >
            MOIS
          </button>
          <button 
            onClick={() => setMode('TOT')} 
            className={`flex-1 p-2 text-center f-app font-bold cursor-pointer border-none ${mode === 'TOT' ? 'bg-[#FFFFFF] text-[#000000] shadow-sm' : 'bg-transparent text-neutral-500 hover:bg-neutral-200'}`}
          >
            TOT
          </button>
        </div>

        {/* Second toggle button toggle: [ACTIVES] VENTES [ANNULÉES] */}
        <div className="flex items-center bg-[#F0F0F0] rounded p-1 shrink-0 text-xs">
          <button 
            type="button"
            onClick={() => setSalesTypeFilter('ACTIVES')} 
            className={`flex-1 p-2 text-center f-app font-bold cursor-pointer rounded-sm border-none ${salesTypeFilter === 'ACTIVES' ? 'bg-[#FFFFFF] text-[#000000] shadow-sm' : 'bg-transparent text-neutral-500 hover:bg-neutral-200'}`}
          >
            ACTIVES
          </button>
          <span className="px-3 text-[#000000] font-bold f-app select-none">VENTES</span>
          <button 
            type="button"
            onClick={() => setSalesTypeFilter('ANNULEES')} 
            className={`flex-1 p-2 text-center f-app font-bold cursor-pointer rounded-sm border-none ${salesTypeFilter === 'ANNULEES' ? 'bg-[#FFFFFF] text-[#000000] shadow-sm' : 'bg-transparent text-neutral-500 hover:bg-neutral-200'}`}
          >
            ANNULÉES
          </button>
        </div>

        <div className={`flex items-center justify-between p-2 shrink-0 transition-opacity gap-2 ${mode === 'TOT' ? 'opacity-40 pointer-events-none bg-neutral-100' : 'bg-[#F0F0F0]'}`}>
          <button onClick={handlePrevMonth} className="px-8 py-2 cursor-pointer border border-neutral-300 bg-[#FFFFFF] hover:bg-neutral-200 rounded flex items-center justify-center transition-colors text-neutral-700">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="f-app font-bold text-[#000000] capitalize text-center flex-1">{displayMonth}</span>
          <button onClick={handleNextMonth} className="px-8 py-2 cursor-pointer border border-neutral-300 bg-[#FFFFFF] hover:bg-neutral-200 rounded flex items-center justify-center transition-colors text-neutral-700">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Legend showing active and archived colors */}
        <div className="flex items-center justify-between text-[11px] font-bold px-1.5 py-1 bg-[#F9F9F9] border border-neutral-200 rounded shrink-0">
          <div className="flex items-center gap-1.5 text-[#000000]">
            <span className="w-2 h-2 bg-[#000000] rounded-sm shrink-0"></span>
            <span className="f-app">Produits actifs</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-600">
            <span className="w-2 h-2 bg-rose-600 rounded-sm shrink-0"></span>
            <span className="f-app">Produits archivés</span>
          </div>
        </div>

        <div className="border border-neutral-200 rounded">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-[#F0F0F0]">
              <tr>
                <th className="p-2 f-app font-bold text-xs text-[#000000] border-b border-neutral-200 w-[20%] truncate whitespace-nowrap">CODE</th>
                <th className="p-2 f-app font-bold text-xs text-[#000000] border-b border-neutral-200 w-[40%] truncate whitespace-nowrap">NOM</th>
                <th className="p-2 f-app font-bold text-xs text-[#000000] border-b border-neutral-200 w-[20%] truncate whitespace-nowrap text-right">MS</th>
                <th className="p-2 f-app font-bold text-xs text-[#000000] text-right border-b border-neutral-200 w-[20%] truncate whitespace-nowrap">NBR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const formattedNbr = formatNumberAmount(r.nbr, settings.decimalMode);
                const nbrParts = splitAmountString(formattedNbr, settings.decimalMode);
                return (
                  <tr key={i} className={`border-b border-neutral-100 hover:bg-neutral-50 ${r.isArchived ? 'text-rose-600' : 'text-[#000000]'}`}>
                    <td className="p-2 f-app text-sm font-normal whitespace-nowrap truncate w-[20%]" title={r.code}>{r.code}</td>
                    <td className="p-2 f-app text-sm font-normal whitespace-nowrap truncate w-[40%]" title={r.nom}>{r.nom}</td>
                    <td className="p-2 f-app text-sm font-normal whitespace-nowrap truncate w-[20%] text-right" title={r.ms}>{r.ms}</td>
                    <td className="p-2 f-app text-sm font-normal whitespace-nowrap truncate w-[20%] text-right" title={r.nbr.toString()}>
                      {nbrParts.intPart}
                      {nbrParts.decPart !== undefined && (
                        <>
                          ,
                          <span className="text-[0.75em]">{nbrParts.decPart}</span>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderServices = () => {
    const serviceStats: Record<string, { code: string; nom: string; ms: string; nbr: number; isArchived: boolean }> = {};
    services.forEach(s => {
      serviceStats[s.id] = { code: s.code, nom: s.nom, ms: s.mesure || '', nbr: 0, isArchived: !!s.isArchived };
    });

    const salesSource = salesTypeFilter === 'ACTIVES' ? activeSales : cancelledSales;

    salesSource.forEach(s => {
      const d = new Date(s.createdAt);
      if (mode === 'TOT' || isSameMonth(d, selectedMonth)) {
        s.items.forEach(item => {
          if (item.type === 'service') {
            const sId = item.itemId;
            const qty = parseFloat(`${item.quantiteInt || '0'}.${item.quantiteDec || '0'}`);
            if (sId && serviceStats[sId]) {
              serviceStats[sId].nbr += qty;
            } else {
              const sObj = services.find(sv => sv.code === item.code);
              if (sObj && serviceStats[sObj.id]) {
                serviceStats[sObj.id].nbr += qty;
              }
            }
          }
        });
      }
    });

    const rows = Object.values(serviceStats).sort((a, b) => a.code.localeCompare(b.code));

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center bg-[#F0F0F0] rounded p-1 shrink-0">
          <button 
            onClick={() => setMode('MOIS')} 
            className={`flex-1 p-2 text-center f-app font-bold cursor-pointer border-none ${mode === 'MOIS' ? 'bg-[#FFFFFF] text-[#000000] shadow-sm' : 'bg-transparent text-neutral-500 hover:bg-neutral-200'}`}
          >
            MOIS
          </button>
          <button 
            onClick={() => setMode('TOT')} 
            className={`flex-1 p-2 text-center f-app font-bold cursor-pointer border-none ${mode === 'TOT' ? 'bg-[#FFFFFF] text-[#000000] shadow-sm' : 'bg-transparent text-neutral-500 hover:bg-neutral-200'}`}
          >
            TOT
          </button>
        </div>

        {/* Second toggle button toggle: [ACTIVES] VENTES [ANNULÉES] */}
        <div className="flex items-center bg-[#F0F0F0] rounded p-1 shrink-0 text-xs">
          <button 
            type="button"
            onClick={() => setSalesTypeFilter('ACTIVES')} 
            className={`flex-1 p-2 text-center f-app font-bold cursor-pointer rounded-sm border-none ${salesTypeFilter === 'ACTIVES' ? 'bg-[#FFFFFF] text-[#000000] shadow-sm' : 'bg-transparent text-neutral-500 hover:bg-neutral-200'}`}
          >
            ACTIVES
          </button>
          <span className="px-3 text-[#000000] font-bold f-app select-none">VENTES</span>
          <button 
            type="button"
            onClick={() => setSalesTypeFilter('ANNULEES')} 
            className={`flex-1 p-2 text-center f-app font-bold cursor-pointer rounded-sm border-none ${salesTypeFilter === 'ANNULEES' ? 'bg-[#FFFFFF] text-[#000000] shadow-sm' : 'bg-transparent text-neutral-500 hover:bg-neutral-200'}`}
          >
            ANNULÉES
          </button>
        </div>

        <div className={`flex items-center justify-between p-2 shrink-0 transition-opacity gap-2 ${mode === 'TOT' ? 'opacity-40 pointer-events-none bg-neutral-100' : 'bg-[#F0F0F0]'}`}>
          <button onClick={handlePrevMonth} className="px-8 py-2 cursor-pointer border border-neutral-300 bg-[#FFFFFF] hover:bg-neutral-200 rounded flex items-center justify-center transition-colors text-neutral-700">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="f-app font-bold text-[#000000] capitalize text-center flex-1">{displayMonth}</span>
          <button onClick={handleNextMonth} className="px-8 py-2 cursor-pointer border border-neutral-300 bg-[#FFFFFF] hover:bg-neutral-200 rounded flex items-center justify-center transition-colors text-neutral-700">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Legend showing active and archived colors */}
        <div className="flex items-center justify-between text-[11px] font-bold px-1.5 py-1 bg-[#F9F9F9] border border-neutral-200 rounded shrink-0">
          <div className="flex items-center gap-1.5 text-[#000000]">
            <span className="w-2 h-2 bg-[#000000] rounded-sm shrink-0"></span>
            <span className="f-app">Services actifs</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-600">
            <span className="w-2 h-2 bg-rose-600 rounded-sm shrink-0"></span>
            <span className="f-app">Services archivés</span>
          </div>
        </div>

        <div className="border border-neutral-200 rounded">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-[#F0F0F0]">
              <tr>
                <th className="p-2 f-app font-bold text-xs text-[#000000] border-b border-neutral-200 w-[20%] truncate whitespace-nowrap">CODE</th>
                <th className="p-2 f-app font-bold text-xs text-[#000000] border-b border-neutral-200 w-[40%] truncate whitespace-nowrap">NOM</th>
                <th className="p-2 f-app font-bold text-xs text-[#000000] border-b border-neutral-200 w-[20%] truncate whitespace-nowrap text-right">MS</th>
                <th className="p-2 f-app font-bold text-xs text-[#000000] text-right border-b border-neutral-200 w-[20%] truncate whitespace-nowrap">NBR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const formattedNbr = formatNumberAmount(r.nbr, settings.decimalMode);
                const nbrParts = splitAmountString(formattedNbr, settings.decimalMode);
                return (
                  <tr key={i} className={`border-b border-neutral-100 hover:bg-neutral-50 ${r.isArchived ? 'text-rose-600' : 'text-[#000000]'}`}>
                    <td className="p-2 f-app text-sm font-normal whitespace-nowrap truncate w-[20%]" title={r.code}>{r.code}</td>
                    <td className="p-2 f-app text-sm font-normal whitespace-nowrap truncate w-[40%]" title={r.nom}>{r.nom}</td>
                    <td className="p-2 f-app text-sm font-normal whitespace-nowrap truncate w-[20%] text-right" title={r.ms}>{r.ms}</td>
                    <td className="p-2 f-app text-sm font-normal whitespace-nowrap truncate w-[20%] text-right" title={r.nbr.toString()}>
                      {nbrParts.intPart}
                      {nbrParts.decPart !== undefined && (
                        <>
                          ,
                          <span className="text-[0.75em]">{nbrParts.decPart}</span>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FFFFFF] relative">
      {/* 5-column, 100% width, icon-only sub-ribbon bar with left and bottom borders */}
      <div className="w-full h-[45px] min-h-[45px] bg-[#D0D0D0] flex shrink-0 overflow-x-auto scrollbar-none px-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              type="button"
              className={`relative flex-1 min-w-[90px] h-[45px] shrink-0 flex items-center justify-center gap-1.5 px-2 f-tab cursor-pointer transition-none border-4 border-black box-border ${
                isActive
                  ? 'bg-[#D0D0D0] text-[#000000]'
                  : 'bg-[#D0D0D0] text-[#555555] hover:bg-[#C8C8C8]'
               }`}
            >
              {isActive && (
                <>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-black" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-black" />
                </>
              )}
              <Icon className="w-5 h-5 shrink-0 z-10" />
            </button>
          );
        })}
      </div>
      {/* Scrollable area below sub-ribbon, exactly matching other tabs to pre-allocate scrollbar space */}
      <div className="flex-1 overflow-y-auto tab-content-scroll bg-[#FFFFFF] p-3 flex flex-col gap-3">
        {/* Dynamic page title in dark gray */}
        <h2 className="text-neutral-700 font-bold text-sm tracking-wide f-app uppercase">
          {activeSubTab === 'ventes' && 'Performance des ventes'}
          {activeSubTab === 'produits' && 'Performance par produit'}
          {activeSubTab === 'services' && 'Performance par service'}
        </h2>

        {activeSubTab === 'ventes' && renderVentes()}
        {activeSubTab === 'produits' && renderProduits()}
        {activeSubTab === 'services' && renderServices()}
      </div>
    </div>
  );
};
