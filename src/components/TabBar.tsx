import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useStore, PLAN_LEVEL, STOCK_THRESHOLD } from '../context/StoreContext';
import { Role } from '../types';
import './Menu.css';

interface TabItem {
  url: string;
  icon: string;
  label: string;
  minPlan?: number;
  ownerOnly?: boolean;
  badge?: 'debt' | 'stock';
}

const tabs: TabItem[] = [
  { url: '/venta',     icon: '🛒',  label: 'Venta'    },
  { url: '/stock',     icon: '📦',  label: 'Stock',     badge: 'stock' },
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
  const threshold = STOCK_THRESHOLD();

  const visibleTabs = tabs.filter(t =>
    (!t.minPlan   || planLevel >= t.minPlan) &&
    (!t.ownerOnly || currentRole === 'owner')
  );

  // Contadores para badges
  const debtCount  = state.debts.length;
  const stockCount = state.productos.filter(
    p => p.stock === 0 || p.stock <= (p.stockMinimo ?? threshold)
  ).length;

  // Indicador deslizante: medimos solo los .nav-btn (no el indicador)
  const navRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });

  // useLayoutEffect para que la medición pase antes del paint
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const measure = () => {
      const btns = nav.querySelectorAll<HTMLElement>('.nav-btn');
      const activeIdx = visibleTabs.findIndex(t => t.url === location.pathname);
      if (activeIdx < 0 || !btns[activeIdx]) {
        setIndicator(i => ({ ...i, opacity: 0 }));
        return;
      }
      const btn   = btns[activeIdx];
      const nRect = nav.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setIndicator({
        left:    bRect.left - nRect.left + 6,
        width:   bRect.width - 12,
        opacity: 1,
      });
    };

    measure();
    // re-medir si la ventana cambia de tamaño (rotación, split-screen)
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [location.pathname, visibleTabs.length]);

  // pequeño re-measure a los 50ms para casos de fuentes/transiciones lentas
  useEffect(() => {
    const t = setTimeout(() => {
      const nav = navRef.current;
      if (!nav) return;
      const btns = nav.querySelectorAll<HTMLElement>('.nav-btn');
      const activeIdx = visibleTabs.findIndex(tab => tab.url === location.pathname);
      if (activeIdx < 0 || !btns[activeIdx]) return;
      const btn   = btns[activeIdx];
      const nRect = nav.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setIndicator({
        left:    bRect.left - nRect.left + 6,
        width:   bRect.width - 12,
        opacity: 1,
      });
    }, 50);
    return () => clearTimeout(t);
  }, [location.pathname, visibleTabs.length]);

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <div className="bottom-nav__inner" ref={navRef}>
        <div
          className="bottom-nav__indicator"
          style={{
            transform: `translateX(${indicator.left}px)`,
            width:     `${indicator.width}px`,
            opacity:   indicator.opacity,
          }}
        />
        {visibleTabs.map(tab => {
          const active = location.pathname === tab.url;
          let badgeNum = 0;
          if (tab.badge === 'debt'  && debtCount  > 0) badgeNum = debtCount;
          if (tab.badge === 'stock' && stockCount > 0) badgeNum = stockCount;
          const badgeClass = tab.badge === 'stock' ? 'nav-badge nav-badge--warn' : 'nav-badge';
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
                {badgeNum > 0 && (
                  <span
                    className={badgeClass}
                    aria-label={
                      tab.badge === 'debt'
                        ? `${badgeNum} deuda${badgeNum > 1 ? 's' : ''} pendiente${badgeNum > 1 ? 's' : ''}`
                        : `${badgeNum} producto${badgeNum > 1 ? 's' : ''} con stock crítico`
                    }
                  >
                    {badgeNum > 99 ? '99+' : badgeNum}
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
