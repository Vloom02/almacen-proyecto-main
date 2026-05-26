import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useStore, PLAN_LEVEL } from '../context/StoreContext';
import { Role } from '../types';
import './Menu.css';

interface TabItem {
  url: string;
  icon: string;        // emoji (estilo original)
  label: string;
  minPlan?: number;    // plan mínimo para que aparezca
  ownerOnly?: boolean; // solo para el dueño
  badge?: 'debt';      // qué badge mostrar (si corresponde)
}

const tabs: TabItem[] = [
  { url: '/venta',     icon: '🛒',  label: 'Venta'     },
  { url: '/stock',     icon: '📦',  label: 'Stock'     },
  { url: '/reportes',  icon: '📊',  label: 'Reportes',  minPlan: 2 },
  { url: '/deudas',    icon: '📒',  label: 'Deudas',    minPlan: 2, badge: 'debt' },
  { url: '/historial', icon: '📋',  label: 'Historial' },
  { url: '/config',    icon: '⚙️',  label: 'Config',    ownerOnly: true },
];

interface Props { currentRole: Role; }

const TabBar: React.FC<Props> = ({ currentRole }) => {
  const location  = useLocation();
  const history   = useHistory();
  const { state } = useStore();
  const planLevel = PLAN_LEVEL();

  const visibleTabs = tabs.filter(t =>
    (!t.minPlan    || planLevel >= t.minPlan) &&
    (!t.ownerOnly  || currentRole === 'owner')
  );

  // Indicador deslizante: animamos un pill detrás del tab activo
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeIdx = visibleTabs.findIndex(t => t.url === location.pathname);
    if (activeIdx < 0) { setIndicator(i => ({ ...i, opacity: 0 })); return; }
    const btn = container.children[activeIdx] as HTMLElement | undefined;
    if (!btn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    setIndicator({ left: bRect.left - cRect.left + 6, width: bRect.width - 12, opacity: 1 });
  }, [location.pathname, visibleTabs.length]);

  const debtCount = state.debts.length;

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <div className="bottom-nav__inner" ref={containerRef}>
        <div
          className="bottom-nav__indicator"
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: `${indicator.width}px`,
            opacity: indicator.opacity,
          }}
        />
        {visibleTabs.map(tab => {
          const active = location.pathname === tab.url;
          const showDebtBadge = tab.badge === 'debt' && debtCount > 0;
          return (
            <a
              key={tab.url}
              href={tab.url}
              className={`nav-btn${active ? ' active' : ''}`}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              onClick={e => {
                e.preventDefault();
                if (location.pathname !== tab.url) history.push(tab.url);
              }}
            >
              <span className="nav-icon-wrap">
                <span className="nav-icon" aria-hidden="true">{tab.icon}</span>
                {showDebtBadge && (
                  <span className="nav-badge" aria-label={`${debtCount} deudas pendientes`}>
                    {debtCount > 99 ? '99+' : debtCount}
                  </span>
                )}
              </span>
              <span className="nav-label">{tab.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
};

export default TabBar;
