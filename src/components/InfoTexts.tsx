import React from 'react';
import { Heart, Database, Cloud, Lock, FileJson, AlertTriangle } from 'lucide-react';

export const SoutenirBlock = () => (
  <div className="bg-[#116611] p-4 flex flex-col gap-2 shrink-0">
    <div className="flex items-center gap-2 mb-1 text-[#FFFFFF]">
      <Heart className="w-5 h-5 shrink-0" />
      <h3 className="f-app font-bold text-lg m-0">Soutenir FCP</h3>
    </div>
    <p className="f-app text-sm text-[#FFFFFF] m-0 leading-relaxed">
      Pour soutenir l'entretien et le développement continu de cette application gratuite, vos dons sont les bienvenus ! 
    </p>
    <div className="text-white text-base font-bold select-all tracking-[0.18em] pt-1">
      MVOLA: <span>0340210601</span>
    </div>
  </div>
);

export const FonctionnalitesContent = () => (
  <div className="flex flex-col gap-4">
    <h2 className="f-app text-xl font-bold text-[#000000] border-b-2 border-black pb-1 mb-2">
      Fonctionnalités
    </h2>
    
    <div className="bg-[#F0F0F0] p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <Database className="w-5 h-5 text-black shrink-0" />
        <h3 className="f-app font-bold text-lg m-0">Vocation de l'Outil</h3>
      </div>
      <p className="f-app text-sm text-neutral-800 m-0 leading-relaxed">
        Veuillez noter que FCP n'est pas un site e-commerce ni une plateforme de vente en ligne. 
        Il s'agit d'un <strong>outil privé et personnel</strong> de sauvegarde et de suivi de statistiques liées à vos activités.
        Gérez vos clients, facturez rapidement et gardez une trace de toutes vos ventes.
      </p>
    </div>

    <div className="bg-[#F0F0F0] p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <Cloud className="w-5 h-5 text-black shrink-0" />
        <h3 className="f-app font-bold text-lg m-0">Sauvegarde Cloud</h3>
      </div>
      <p className="f-app text-sm text-neutral-800 m-0 leading-relaxed">
        Toutes vos modifications sont sauvegardées en temps réel sur le cloud (votre propre Google Drive) et accessibles depuis n'importe quel appareil connecté à votre compte.
      </p>
    </div>

    <div className="bg-[#F0F0F0] p-4 flex flex-col gap-2">
      <h3 className="f-app font-bold text-lg m-0 mb-1">Fonctionnement Hors-Ligne</h3>
      <p className="f-app text-sm text-neutral-800 m-0 leading-relaxed">
        Une fois l'application chargée, vous pouvez l'utiliser. Les données se synchroniseront automatiquement lorsque vous retrouverez une connexion internet. Toutefois, <strong>le mode de fonctionnement optimal reste l'utilisation avec une connexion internet active</strong> pour garantir la sauvegarde immédiate de vos données.
        <br /><br />
        <strong>Attention :</strong> Si vous videz le cache ou l'historique de votre navigateur, ou si vous le désinstallez avant que la synchronisation n'ait pu se faire, les données saisies hors-ligne seront perdues.
      </p>
    </div>
  </div>
);

export const ConditionsContent = () => (
  <div className="flex flex-col gap-4">
    <h2 className="f-app text-xl font-bold text-[#000000] border-b-2 border-black pb-1 mb-2">
      Conditions et Confidentialité
    </h2>

    <div className="bg-[#F0F0F0] p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1 text-black">
        <Lock className="w-5 h-5 shrink-0" />
        <h3 className="f-app font-bold text-lg m-0">Vos données vous appartiennent</h3>
      </div>
      <p className="f-app text-sm text-neutral-800 m-0 leading-relaxed">
        FCP ne stocke aucune de vos données personnelles (produits, ventes, clients) sur ses propres serveurs. 
        Tout est <strong>exclusivement enregistré sur votre compte Google Drive personnel</strong>, dans un dossier qui vous appartient.
      </p>
    </div>

    <div className="bg-[#F0F0F0] p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1 text-black">
        <FileJson className="w-5 h-5 shrink-0" />
        <h3 className="f-app font-bold text-lg m-0">Format Ouvert Universel</h3>
      </div>
      <p className="f-app text-sm text-neutral-800 m-0 leading-relaxed">
        FCP n'est qu'un médium de lecture et de saisie. Vos données sont sauvegardées sous le format <strong>JSON</strong> (data.json), qui est un format de texte informatique standard, gratuit et universel. 
        <br/><br/>
        Vous n'êtes pas enfermé dans notre système : vos informations restent entièrement lisibles et exploitables par tout autre logiciel ou développeur disposant du codage adéquat.
      </p>
    </div>

    <div className="bg-[#F0F0F0] p-4 flex flex-col gap-2">
      <h3 className="f-app font-bold text-lg m-0 mb-1">Autorisations Google</h3>
      <p className="f-app text-sm text-neutral-800 m-0 leading-relaxed">
        Pour fonctionner, l'application a demandé l'accès en lecture/écriture à un dossier spécifique de votre Google Drive ("fcp_..."). 
        L'application n'a accès <strong>qu'aux fichiers qu'elle a elle-même créés</strong> et ne peut en aucun cas lire vos documents personnels ou vos emails.
      </p>
    </div>
    
    <div className="bg-[#F0F0F0] p-4 flex flex-col gap-2">
      <h3 className="f-app font-bold text-lg m-0 mb-1">Synchronisation</h3>
      <p className="f-app text-sm text-neutral-800 m-0 leading-relaxed">
        La synchronisation des données vers votre Google Drive est <strong>entièrement automatique</strong>. 
        Il n'y a pas besoin de bouton pour forcer la synchronisation. À chaque modification, une sauvegarde transparente est effectuée en arrière-plan.
      </p>
    </div>

    <div className="bg-[#F0F0F0] p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1 text-black">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <h3 className="f-app font-bold text-lg m-0">Limitation de Responsabilité</h3>
      </div>
      <p className="f-app text-sm text-neutral-800 m-0 leading-relaxed">
        L'application est fournie "en l'état" et son utilisation se fait sous votre entière responsabilité. 
        <br/><br/>
        Le créateur et l'éditeur de l'application déclinent toute responsabilité en cas de perte de données, de corruption de fichier, d'erreur de manipulation, d'interruption du service Cloud, ou de suppression accidentelle du fichier de sauvegarde sur votre Drive. 
        <br/><br/>
        <strong>Vous avez la possibilité d'archiver manuellement vos propres données en les copiant depuis votre Google Drive depuis le dossier "fcp_nomgoogle" (nomgoogle étant la première partie de votre adresse email).</strong>
      </p>
    </div>
  </div>
);
