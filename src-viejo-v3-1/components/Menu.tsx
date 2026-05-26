import React from 'react';
import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
} from '@ionic/react';
import { cartOutline, cubeOutline, barChartOutline, documentTextOutline, settingsOutline, listOutline } from 'ionicons/icons';

import './Menu.css';

interface AppPage {
  url: string;
  icon: string;
  title: string;
  tab?: string;
}

const appPages: AppPage[] = [
  { title: 'Venta',     url: '/venta',     icon: cartOutline,         tab: 'venta' },
  { title: 'Stock',     url: '/stock',     icon: cubeOutline,         tab: 'stock' },
  { title: 'Reportes',  url: '/reportes',  icon: barChartOutline,     tab: 'reportes' },
  { title: 'Deudas',    url: '/deudas',    icon: documentTextOutline, tab: 'deudas' },
  { title: 'Historial', url: '/historial', icon: listOutline,         tab: 'historial' },
  { title: 'Config',    url: '/config',    icon: settingsOutline,     tab: 'config' },
];

const Menu: React.FC = () => {
  return (
    <IonMenu contentId="main" type="overlay">
      <IonContent>
        <IonList id="inbox-list">
          <IonListHeader>Almacén</IonListHeader>
          {appPages.map((appPage, index) => (
            <IonMenuToggle key={index} autoHide={false}>
              <IonItem routerLink={appPage.url} routerDirection="none" lines="none" detail={false}>
                <IonIcon aria-hidden="true" slot="start" icon={appPage.icon} />
                <IonLabel>{appPage.title}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          ))}
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default Menu;
