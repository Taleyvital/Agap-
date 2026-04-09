import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// Types pour le plan de lecture
interface ReadingDay {
  day: number;
  ref: string;
  title: string;
  reflection: string;
  questions: string[];
}

interface ReadingPlan {
  title: string;
  description: string;
  theme: string;
  verses_per_day: ReadingDay[];
}

// Banques de versets thématiques par défi de vie
const versesByChallenge: Record<string, Array<{ref: string; title: string; reflection: string; questions: string[]}>> = {
  "anxiety": [
    { ref: "Phil 4:6-7", title: "La paix qui dépasse l'entendement", reflection: "Paul nous invite à transformer notre anxiété en prière. Quand nous présentons nos inquiétudes à Dieu avec reconnaissance, Sa paix surprenante vient garder nos cœurs et nos pensées.", questions: ["Qu'est-ce qui vous angoisse aujourd'hui et comment pouvez-vous le confier à Dieu ?", "Quelle promesse de paix pouvez-vous retenir de ce passage ?"] },
    { ref: "Mat 6:25-34", title: "Confiance divine au quotidien", reflection: "Jésus nous rappelle que Dieu prend soin de chaque détail de notre existence. Notre valeur dépasse celle des oiseaux et des lis, et Dieu connait chacun de nos besoins.", questions: ["De quoi vous inquiétez-vous inutilement ?", "Comment pouvez-vous mieux faire confiance à la providence divine ?"] },
    { ref: "Psa 46:1-3", title: "Refuge en temps de trouble", reflection: "Dieu est présent même quand tout semble s'effondrer. La terre peut trembler et les montagnes chuter, mais le Seigneur reste notre refuge et notre forteresse.", questions: ["En quoi Dieu peut-il être votre refuge dans cette saison ?", "Quels troubles avez-vous besoin de lui confier ?"] },
    { ref: "1 Pi 5:6-7", title: "Jeter le fardeau sur Dieu", reflection: "Peter nous encourage à humilier nos soucis devant Dieu. Il se soucie personnellement de chaque détail de nos vies, et nous pouvons déposer tout notre anxiété sur Lui.", questions: ["Quels fardeaux avez-vous du mal à abandonner ?", "Comment l'humilité nous aide-t-elle à lâcher prise ?"] },
    { ref: "Ésaïe 26:3", title: "Paix parfaite par la confiance", reflection: "Dieu garde en paix parfaite celui dont l'esprit est fixé sur Lui. La confiance n'est pas le déni des problèmes, mais la certitude que Dieu les gère.", questions: ["Comment fixer votre esprit sur Dieu aujourd'hui ?", "Qu'est-ce qui menace votre paix intérieure ?"] },
    { ref: "Psa 23:1-4", title: "Aucun manque, aucune peur", reflection: "Le Seigneur est notre berger, donc nous ne manquons de rien. Même dans la vallée de l'ombre de la mort, nous ne craignons aucun mal car Il est avec nous.", questions: ["En quoi reconnaissez-vous la provision divine dans votre vie ?", "Comment ressentez-vous la présence de Dieu dans les moments difficiles ?"] },
    { ref: "2 Tim 1:7", title: "Esprit de force et d'amour", reflection: "Dieu ne nous a pas donné un esprit de timidité ou de peur, mais de puissance, d'amour et de maîtrise de soi. Cette puissance nous vient de l'Esprit Saint.", questions: ["Où avez-vous besoin de courage dans votre vie actuelle ?", "Comment l'amour peut-il chasser la peur ?"] },
    { ref: "Rom 8:28", title: "Tout concourt au bien", reflection: "Dans toutes choses, Dieu travaille pour le bien de ceux qui L'aiment. Cette promesse ne dit pas que tout est bon, mais que Dieu fait aboutir toutes choses à notre bien.", questions: ["Comment Dieu pourrait-il transformer votre situation actuelle ?", "Quelle perspective éternelle pouvez-vous cultiver ?"] },
    { ref: "Psa 55:22", title: "Dieu vous soutiendra", reflection: "Jette ton fardeau sur l'Éternel, et Il te soutiendra. Il ne laissera jamais le juste chanceler. Dieu promet de nous soutenir quand nous lui confions nos soucis.", questions: ["Quels fardeaux devez-vous jeter sur Dieu aujourd'hui ?", "Qu'est-ce qui vous empêche de lui faire entièrement confiance ?"] },
    { ref: "Jean 14:27", title: "Ma paix, je vous la donne", reflection: "Jésus offre une paix différente de celle du monde. Sa paix ne dépend pas des circonstances mais de Sa présence et de Ses promesses.", questions: ["Comment la paix de Christ diffère-t-elle de la paix mondaine ?", "Quelle promesse de Jésus vous apaise aujourd'hui ?"] },
    { ref: "Héb 13:5-6", title: "Jamais abandonné", reflection: "Dieu ne nous abandonne jamais. Cette promesse inébranlable nous libère pour dire avec confiance : l'Éternel est mon aide, je ne craindrai rien.", questions: ["Avez-vous déjà ressenti un abandon ? Comment cette promesse vous console-t-elle ?", "De quoi avez-vous besoin d'être libéré par cette assurance ?"] },
    { ref: "Josué 1:9", title: "Fort et courageux", reflection: "Dieu commande le courage et promet Sa présence partout où nous irons. Nous n'avons pas à craindre ni à nous décourager.", questions: ["Quelle nouvelle étape requiert du courage de votre part ?", "Comment la présence de Dieu change-t-elle votre perspective ?"] },
    { ref: "Psa 121:1-2", title: "Le secours vient de l'Éternel", reflection: "Notre secours vient du Créateur des cieux et de la terre. Celui qui tient l'univers en main se soucie de chaque détail de notre vie.", questions: ["D'où cherchez-vous habituellement le secours ?", "Comment Dieu vous a-t-il déjà secouru par le passé ?"] },
    { ref: "Rom 15:13", title: "Débordement d'espérance", reflection: "Le Dieu de l'espérance peut nous remplir de joie et de paix, afin que nous débordions d'espérance par la puissance de l'Esprit Saint.", questions: ["Comment cultiver un espoir qui déborde ?", "De quoi avez-vous besoin d'espérance aujourd'hui ?"] }
  ],
  "grief": [
    { ref: "Matthieu 5:4", title: "Consolation pour les affligés", reflection: "Jésus lui-même promet de bénir et de consoler ceux qui pleurent. Notre douleur n'est pas ignorée de Dieu; Il entre dans notre deuil avec compassion.", questions: ["Comment Jésus partage-t-il votre deuil ?", "Quelle promesse de consolation retenez-vous ?"] },
    { ref: "Psa 34:18", title: "Proche du cœur brisé", reflection: "L'Éternel est proche de ceux qui ont le cœur brisé. Dieu ne se tient pas à distance de notre douleur; Il vient près pour sauver et guérir.", questions: ["Comment ressentez-vous la proximité de Dieu dans votre deuil ?", "De quelle saveur avez-vous besoin aujourd'hui ?"] },
    { ref: "Apocalypse 21:4", title: "Essuyer toute larme", reflection: "Un jour, Dieu essuiera toute larme de nos yeux. Ni deuil, ni cri, ni douleur n'existeront plus. Cette espérance future illumine notre présent.", questions: ["Quelle espérance éternelle peut apaiser votre deuil présent ?", "Comment imaginer cette réalité future sans douleur ?"] },
    { ref: "Psa 147:3", title: "Panser les cœurs meurtris", reflection: "Dieu guérit ceux qui ont le cœur brisé et pansent leurs blessures. Notre Père céleste est un médecin compatissant de nos âmes.", questions: ["Comment Dieu panse votre cœur en ce moment ?", "Quelles blessures nécessitent encore sa guérison ?"] },
    { ref: "2 Corinthiens 1:3-4", title: "Dieu de toute consolation", reflection: "Le Père des miséricordes nous console afin que nous puissions consoler autres. Notre douleur transformée devient ministère pour d'autres.", questions: ["Comment votre deuil pourrait devenir une source de réconfort pour autrui ?", "De quelle consolation avez-vous reçu ?"] },
    { ref: "Jean 11:35", title: "Jésus a pleuré", reflection: "Face à la mort de Lazare, Jésus a pleuré. Notre Seigneur comprend personnellement la douleur du deuil; Il pleure avec nous.", questions: ["Quelle signification a le fait que Jésus ait pleuré ?", "Comment cette vérité change votre rapport à votre propre chagrin ?"] },
    { ref: "Psa 30:5", title: "Joie au matin", reflection: "La nuit peut être longue, mais la joie vient au matin. Le deuil est une saison qui passe, et Dieu promet de transformer notre lamentation en danse.", questions: ["Comment percevoir votre deuil comme une saison ?", "Quelles graines de joie voyez-vous déjà germer ?"] },
    { ref: "1 Thessaloniciens 4:13-14", title: "Espérance face à la mort", reflection: "Nous ne désespérons pas comme ceux qui n'ont pas d'espérance. La résurrection de Jésus garantit que nous reverrons nos bien-aimés en Lui.", questions: ["Quelle différence fait l'espérance chrétienne dans votre deuil ?", "Comment la résurrection de Jésus transforme-t-elle votre perspective ?"] },
    { ref: "Ésaïe 41:10", title: "Ne crains rien, je te fortifie", reflection: "Dans notre peine, Dieu promet d'être avec nous, de nous fortifier et de nous soutenir. Sa main droite nous prend pour nous garder.", questions: ["Comment Dieu vous fortifie-t-il dans cette saison de deuil ?", "Quelles craintes accompagnent votre douleur ?"] },
    { ref: "Psa 42:11", title: "Espère en Dieu", reflection: "Quand notre âme est abattue, nous pouvons nous tourner vers Dieu. L'espérance en Lui est une décision que nous pouvons faire même au milieu des larmes.", questions: ["Comment cultiver l'espérance quand l'âme est abattue ?", "Quelles vérités sur Dieu pouvez-vous rappeler à votre âme ?"] },
    { ref: "Rom 8:38-39", title: "Rien ne peut nous séparer", reflection: "Ni la vie ni la mort ne peut nous séparer de l'amour de Dieu. Nos liens d'amour transcendent la mort car l'amour de Dieu les enveloppe.", questions: ["Comment cette vérité vous réconforte-t-elle sur vos liens d'amour ?", "De quelle séparation avez-vous peur ?"] },
    { ref: "Psa 73:26", title: "Dieu, force de mon cœur", reflection: "Quand chair et cœur défaillent, Dieu demeure la roche de notre cœur et notre part pour toujours. Il est notre refuge éternel.", questions: ["Comment Dieu est-il devenu votre force dans ce deuil ?", "Quelle part vous reste-t-il malgré la perte ?"] },
    { ref: "Lamentations 3:22-23", reflection: "Les compassions de l'Éternel ne sont pas épuisées; elles se renouvellent chaque matin. Sa fidélité est grande, même au cœur de nos lamentations.", title: "Compassions renouvelées", questions: ["Comment les compassions de Dieu se manifestent-elles aujourd'hui ?", "Quelle nouvelle grâce pouvez-vous accueillir ce matin ?"] },
    { ref: "Jean 16:22", title: "Joie que nul ne peut enlever", reflection: "Votre chagrin se changera en joie. Cette joie future est irréversible et personne ne peut nous la ravir.", questions: ["Quelle joie durable vous attend au-delà de la douleur présente ?", "Comment cette promesse vous aide-t-elle à tenir ?"] }
  ],
  "direction": [
    { ref: "Proverbes 3:5-6", title: "Reconnais-le dans tes voies", reflection: "Confier notre vie à Dieu de tout notre cœur et reconnaître Sa présence dans chaque décision est la clé pour voir nos chemins droits.", questions: ["Quelle décision actuelle nécessite votre confiance totale ?", "Comment reconnaître Dieu dans vos choix quotidiens ?"] },
    { ref: "Psaume 32:8", title: "Je t'enseignerai la voie", reflection: "Dieu promet de nous instruire, de nous montrer le chemin à suivre et de nous garder par Ses regards de tendresse.", questions: ["Comment Dieu vous a-t-il enseigné récemment ?", "Où avez-vous besoin de Ses regards ?"] },
    { ref: "Ésaïe 30:21", title: "Voici, c'est ici le chemin", reflection: "Nos oreilles entendront une voix derrière nous disant: Voici le chemin, marchez-y. Dieu guide pas à pas quand nous prêtons attention.", questions: ["Comment cultiver une oreille attentive à la voix divine ?", "Quelle étape suivante vous semble être le chemin ?"] },
    { ref: "Jacques 1:5", title: "Sagesse qui se donne librement", reflection: "Si quelqu'un manque de sagesse, qu'il la demande à Dieu qui donne à tous libéralement. La sagesse divine est un cadeau, non une récompense.", questions: ["Dans quel domaine avez-vous besoin de sagesse divine ?", "Comment recevoir cette sagesse libéralement ?"] },
    { ref: "Psaume 37:4-5", title: "Désirs et délices", reflection: "Quand nous trouvons notre délice en Dieu, Il façonne nos désirs selon Sa volonté. Confier nos voies au Seigneur, c'est les voir s'accomplir.", questions: ["Quels sont vos véritables désirs quand vous vous délectez en Dieu ?", "Comment lui confier vos projets concrètement ?"] },
    { ref: "Romains 12:2", title: "Transformer par le renouvellement", reflection: "Ne vous conformez pas au siècle présent, mais transformez-vous par le renouvellement de l'intelligence. Ainsi vous discernerez la volonté parfaite de Dieu.", questions: ["Quelles influences du siècle menacent votre discernement ?", "Comment renouveler votre esprit pour mieux discerner ?"] },
    { ref: "Psaume 119:105", title: "Lampe et lumière", reflection: "La parole de Dieu est une lampe pour nos pieds et une lumière sur notre sentier. Elle éclaire pas à pas, suffisamment pour avancer.", questions: ["Quelle lumière la Parole apporte à votre situation actuelle ?", "Quelle prochaine étape éclaire-t-elle ?"] },
    { ref: "Jérémie 29:11", title: "Projets d'avenir et d'espérance", reflection: "Dieu connaît les projets qu'Il forme pour nous: paix et non malheur, un avenir plein d'espérance. Sa perspective dépasse notre compréhension présente.", questions: ["Comment cette promesse vous rassure-t-elle sur votre avenir ?", "Quelle perspective à long terme Dieu pourrait-il avoir ?"] },
    { ref: "Proverbes 16:9", title: "Le cœur médite, Dieu dirige", reflection: "Le cœur de l'homme médite sa voie, mais c'est l'Éternel qui dirige ses pas. Nous pouvons planifier, mais c'est Dieu qui ouvre les portes.", questions: ["Quels projets avez-vous médité récemment ?", "Comment reconnaître la direction divine dans vos pas ?"] },
    { ref: "Jean 10:10", title: "Vie en abondance", reflection: "Jésus est venu pour que nous ayons la vie, et que nous l'ayons en abondance. Cette vie pleine est Son désir pour chaque domaine de notre existence.", questions: ["Qu'est-ce que la vie en abondance signifie pour vous ?", "Quelles zones de votre vie ne sont pas encore pleines ?"] },
    { ref: "Psaume 25:4-5", title: "Montre-moi tes voies", reflection: "David demande humblement à Dieu de lui montrer Ses voies et Ses sentiers. Cette prière d'apprentissage constant est le chemin de la sagesse.", questions: ["Comment demander à Dieu de vous montrer le chemin ?", "Quelles voies de Dieu souhaitez-vous apprendre ?"] },
    { ref: "Jean 14:6", title: "Le Chemin, la Vérité, la Vie", reflection: "Jésus n'est pas seulement un guide; Il est Le Chemin lui-même. Le chemin de la vie se trouve en Lui, dans une relation de confiance.", questions: ["Comment Jésus est-il Le Chemin dans votre vie ?", "Quelle vérité de Christ éclaire votre direction ?"] },
    { ref: "Colossiens 3:15", title: "Paix de Christ arbitre", reflection: "Que la paix de Christ, à laquelle vous avez été appelés en un seul corps, régne dans vos cœurs. Elle peut arbitrer nos décisions.", questions: ["Comment la paix (ou l'inquiétude) guide vos choix ?", "Quelle décision actuelle nécessite cette paix pour arbitre ?"] },
    { ref: "Psaume 23:3", title: "Conduite sur les sentiers droits", reflection: "C'est pour Son nom que Dieu nous conduit sur les sentiers droits. Sa réputation est engagée dans notre guidance vers ce qui est juste et bon.", questions: ["Comment la conduite de Dieu honore-t-elle Son nom ?", "Quels sentiers droits souhaitez-vous emprunter ?"] }
  ],
  "relationship": [
    { ref: "1 Corinthiens 13:4-8", title: "Amour patient et bienveillant", reflection: "L'amour véritable est décrit par ses actions: patience, bienveillance, absence de jalousie. C'est un amour qui se donne, non qui prend.", questions: ["Comment cet amour se compare-t-il à vos relations actuelles ?", "Quelle qualité de l'amour devez-vous cultiver ?"] },
    { ref: "Éphésiens 4:2-3", title: "Humilité et patience", reflection: "Nous sommes appelés à marcher avec humilité, douceur et patience, supportant les autres dans l'amour pour garder l'unité.", questions: ["Comment l'humilité transforme vos relations ?", "Quelle différence avec autrui devez-vous supporter ?"] },
    { ref: "Colossiens 3:12-14", title: "Vêtements du cœur", reflection: "Comme élus de Dieu, nous devons nous revêtir d'entrailles de miséricorde, de bonté, d'humilité, de douceur, de patience... et par-dessus tout, de l'amour.", questions: ["Quels vêtements devez-vous enfiler dans vos relations ?", "Comment l'amour parfait l'ensemble ?"] },
    { ref: "Proverbes 17:17", title: "Amour en toute saison", reflection: "L'ami aime en tout temps, et dans la détresse, il se montre comme un frère. Les vraies relations résistent aux épreuves.", questions: ["Qui vous a montré cet amour en tout temps ?", "Comment être un ami fidèle pour autrui ?"] },
    { ref: "Matthieu 7:12", title: "Règle d'or", reflection: "Tout ce que vous voulez que les hommes fassent pour vous, faites-le pour eux. Cette règle simple transforme toute relation quand elle est appliquée.", questions: ["Qu'attendez-vous des autres que vous ne donnez pas ?", "Comment appliquer la règle d'or aujourd'hui ?"] },
    { ref: "Romains 12:10", title: "Affection fraternelle", reflection: "Que l'affection fraternelle soit votre amour. Soyez honnête et aimez-vous les uns les autres avec respect et préférence mutuelle.", questions: ["Comment cultiver l'affection dans vos relations ?", "En quoi montrez-vous la préférence aux autres ?"] },
    { ref: "Jacques 4:11-12", title: "Ne jugez point", reflection: "Ne parlez pas les uns contre les autres, frères. Celui qui juge son frère juge la loi. L'amour ne médit point et respecte l'autre.", questions: ["Où la critique remplace-t-elle l'amour dans vos relations ?", "Comment l'humilité nous libère du jugement ?"] },
    { ref: "1 Pierre 3:8-9", title: "Unanimité et compassion", reflection: "Ayez une même pensée, des sentiments de compassion, fraternels, miséricordieux et humbles. Répondre par la bénédiction transforme les conflits.", questions: ["Comment cultiver l'unanimité d'esprit ?", "Quel conflit nécessite une réponse de bénédiction ?"] },
    { ref: "Proverbes 27:17", title: "Fer sur fer", reflection: "Le fer s'aiguise par le fer, et l'homme aiguise la face de son ami. Les relations honnêtes nous affûtent et nous font grandir.", questions: ["Qui vous aiguise par son honnêteté ?", "Comment recevez-vous la confrontation constructive ?"] },
    { ref: "Galates 6:2", title: "Porter les fardeaux", reflection: "Portez les fardeaux les uns des autres, et accomplissez ainsi la loi de Christ. L'amour s'incarne dans l'aide concrète.", questions: ["Quels fardeaux pouvez-vous porter pour quelqu'un ?", "Qui porte vos fardeaux actuellement ?"] },
    { ref: "Éphésiens 4:31-32", title: "Pardon comme Dieu", reflection: "Quand l'amertume et la colère s'effacent, nous pouvons être tendres et nous pardonner mutuellement, comme Dieu nous a pardonné.", questions: ["Quelle amertume devez-vous laisser partir ?", "Comment le pardon divin inspire-t-il votre pardon ?"] },
    { ref: "Jean 13:34-35", title: "Nouveau commandement", reflection: "Aimez-vous les uns les autres comme je vous ai aimés. Cet amour imite l'amour de Christ et témoigne du Royaume.", questions: ["Comment l'amour de Christ définit-il votre amour ?", "Quel témoignage votre amour donne-t-il ?"] },
    { ref: "Proverbes 18:24", title: "Amitié fidèle", reflection: "Il a des amis qui se montrent amis pour l'intérêt, mais il existe un ami qui s'attache plus qu'un frère. L'amitié profonde dépasse l'utilité.", questions: ["Quelle est la nature de vos amitiés ?", "Comment cultiver une amitié qui s'attache ?"] },
    { ref: "Romains 15:7", title: "Accueil mutuel", reflection: "Accueillez-vous donc les uns les autres, comme Christ vous a accueillis pour la gloire de Dieu. L'accueil inconditionnel est la marque du Royaume.", questions: ["Comment accueillez-vous les différents ?", "Quelle différence Christ vous a-t-il accueilli ?"] }
  ],
  "default": [
    { ref: "Jean 3:16", title: "Amour éternel", reflection: "Dieu a tant aimé le monde qu'il a donné son Fils unique. Cet amour sacrificial est le fondement de toute notre foi et de notre sécurité.", questions: ["Comment cet amour vous transforme-t-il ?", "Quelle réponse cet amour appelle-t-il ?"] },
    { ref: "Romains 8:1", title: "Aucune condamnation", reflection: "Il n'y a maintenant aucune condamnation pour ceux qui sont en Jésus-Christ. La liberté du pardon est notre réalité permanente.", questions: ["Comment vivez-vous cette non-condamnation ?", "Quelle culpabilité devez-vous laisser ?"] },
    { ref: "Éphésiens 2:8-9", title: "Grâce par la foi", reflection: "Par la grâce vous êtes sauvés, par la foi. Ce n'est pas de vous, c'est le don de Dieu. Nous ne pouvons pas nous sauver nous-mêmes.", questions: ["Comment recevez-vous cette grâce quotidiennement ?", "Quelle œuvre devez-vous arrêter de faire ?"] },
    { ref: "Galates 5:22-23", title: "Fruit de l'Esprit", reflection: "L'amour, la joie, la paix, la patience... sont le fruit naturel de l'Esprit habitant en nous. Ce sont Ses caractéristiques dans notre vie.", questions: ["Quel fruit de l'Esprit cultivez-vous ?", "Comment l'Esprit produit-il ce fruit ?"] },
    { ref: "Philippiens 4:13", title: "Tout par Celui qui me fortifie", reflection: "Je puis tout par Celui qui me fortifie. Cette puissance disponible nous permet d'affronter toute situation en Christ.", questions: ["De quoi avez-vous besoin d'être fortifié ?", "Comment cette puissance opère-t-elle ?"] },
    { ref: "2 Corinthiens 5:17", title: "Nouvelle création", reflection: "Si quelqu'un est en Christ, il est une nouvelle création. Les choses anciennes sont passées; voici, toutes choses sont devenues nouvelles.", questions: ["Quelles choses anciennes sont passées ?", "Quelles nouvelles choses voyez-vous ?"] },
    { ref: "Jérémie 29:11", title: "Projets d'espérance", reflection: "Dieu connaît les projets qu'il forme pour vous: paix et non malheur, un avenir plein d'espérance. Son intention est votre bien.", questions: ["Comment cette promesse vous console-t-elle ?", "Quelle espérance cultivez-vous ?"] },
    { ref: "Psaume 23:1-6", title: "Le Seigneur est mon berger", reflection: "Le Seigneur est mon berger: je ne manque de rien. Ce psaume dépeint la provision, la guidance et la protection divines.", questions: ["Comment le berger vous conduit-il ?", "Quelle provision reconnaissez-vous ?"] },
    { ref: "Matthieu 11:28-30", title: "Venez à moi", reflection: "Venez à moi, vous tous qui êtes fatigués, et je vous donnerai du repos. Le joug de Jésus est doux et son fardeau léger.", questions: ["Quelle fatigue portez-vous à Jésus ?", "Comment trouvez-vous Son repos ?"] },
    { ref: "Romains 12:1-2", title: "Vivre en sacrifice vivant", reflection: "Présentez vos corps comme un sacrifice vivant, saint, agréable à Dieu. C'est là votre culte rationnel, par le renouvellement de l'esprit.", questions: ["Comment votre vie est-elle un sacrifice vivant ?", "Comment se renouvelle votre esprit ?"] },
    { ref: "Jean 15:5", title: "Celui qui demeure en moi", reflection: "Celui qui demeure en moi et en qui je demeure porte beaucoup de fruit. Sans Christ, nous ne pouvons rien faire de spirituel.", questions: ["Comment demeurez-vous en Christ ?", "Quel fruit portez-vous actuellement ?"] },
    { ref: "Hébreux 11:1", title: "Fondement de la foi", reflection: "La foi est une ferme assurance des choses qu'on espère, une démonstration de celles qu'on ne voit pas. C'est la certitude au-delà des sens.", questions: ["Qu'espérez-vous avec assurance ?", "Comment votre foi se démontre ?"] },
    { ref: "1 Jean 4:18-19", title: "Amour parfait", reflection: "L'amour parfait chasse la peur. Nous aimons parce qu'il nous a aimés le premier. L'amour de Dieu est le fondement et la force.", questions: ["Quelles peurs l'amour de Dieu chasse-t-il ?", "Comment cet aimer le premier vous transforme ?"] },
    { ref: "Apocalypse 3:20", title: "À la porte du cœur", reflection: "Voici, je me tiens à la porte et je frappe. Si quelqu'un entend ma voix et ouvre la porte, j'entrerai et je souperai avec lui.", questions: ["Comment Jésus frappe à votre porte ?", "Quel souper partagez-vous avec Lui ?"] }
  ]
};

// Titres de plan selon le défi
const planTitles: Record<string, Record<string, string>> = {
  "anxiety": {
    "title": "14 Jours de Paix Divine",
    "description": "Un parcours biblique pour trouver la paix qui dépasse l'entendement au milieu des angoisses.",
    "theme": "paix divine"
  },
  "grief": {
    "title": "14 Jours de Consolation",
    "description": "Un chemin de guérison et d'espérance à travers les promesses de réconfort divin.",
    "theme": "consolation divine"
  },
  "direction": {
    "title": "14 Jours de Guidance Divine",
    "description": "Un itinéraire spirituel pour discerner la voie de Dieu et trouver Sa direction.",
    "theme": "guidance divine"
  },
  "relationship": {
    "title": "14 Jours d'Amour Bienveillant",
    "description": "Un parcours pour cultiver des relations empreintes de la charité christique.",
    "theme": "amour bienveillant"
  },
  "default": {
    "title": "14 Jours de Fondements Spirituels",
    "description": "Un parcours pour approfondir votre relation avec Dieu et saisir les vérités fondamentales de la foi.",
    "theme": "fondements spirituels"
  }
};

// Ajuster selon la maturité spirituelle
function adjustByMaturity(baseVerses: typeof versesByChallenge["default"], maturity: string): typeof versesByChallenge["default"] {
  if (maturity === "new_believer") {
    // Pour les nouveaux croyants: simplifier les réflexions
    return baseVerses.map(v => ({
      ...v,
      reflection: v.reflection.split('.')[0] + '. ' + v.reflection.split('.')[1] || v.reflection,
      questions: v.questions.slice(0, 1) // Une seule question
    }));
  }
  if (maturity === "mature" || maturity === "leader") {
    // Pour les matures: ajouter profondeur (mais on garde le même contenu)
    return baseVerses;
  }
  // growing: par défaut
  return baseVerses;
}

// POST - Générer un plan de lecture personnalisé
export async function POST(request: Request) {
  try {
    // Vérifier l'authentification
    const authClient = createSupabaseServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer les paramètres depuis le body ou le profil
    let { life_challenge, spiritual_maturity } = await request.json() as {
      life_challenge?: string;
      spiritual_maturity?: string;
    };

    // Si pas de paramètres fournis, les récupérer depuis le profil Supabase
    if (!life_challenge || !spiritual_maturity) {
      const { data: profile } = await authClient
        .from("profiles")
        .select("life_challenge, spiritual_maturity")
        .eq("id", user.id)
        .maybeSingle();
      
      if (profile) {
        life_challenge = life_challenge || profile.life_challenge;
        spiritual_maturity = spiritual_maturity || profile.spiritual_maturity;
      }
    }

    // Normaliser le défi de vie
    const normalizedChallenge = life_challenge?.toLowerCase() || "default";
    const challengeKey = versesByChallenge[normalizedChallenge] ? normalizedChallenge : "default";
    
    // Récupérer les versets pour ce défi
    const baseVerses = versesByChallenge[challengeKey];
    
    // Ajuster selon la maturité
    const adjustedVerses = adjustByMaturity(baseVerses, spiritual_maturity?.toLowerCase() || "growing");
    
    // Construire le plan avec les 14 jours
    const versesPerDay: ReadingDay[] = adjustedVerses.map((verse, index) => ({
      day: index + 1,
      ref: verse.ref,
      title: verse.title,
      reflection: verse.reflection,
      questions: verse.questions
    }));

    // Construire la réponse
    const planInfo = planTitles[challengeKey] || planTitles["default"];
    
    const readingPlan: ReadingPlan = {
      title: planInfo.title,
      description: planInfo.description,
      theme: planInfo.theme,
      verses_per_day: versesPerDay.slice(0, 14) // S'assurer qu'on a max 14 jours
    };

    // Retourner uniquement le JSON (pas de markdown)
    return new Response(JSON.stringify(readingPlan), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error("Error generating reading plan:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du plan de lecture" },
      { status: 500 }
    );
  }
}

// GET - Récupérer le plan de lecture de l'utilisateur connecté (depuis son profil)
export async function GET() {
  try {
    const authClient = createSupabaseServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer le profil de l'utilisateur
    const { data: profile } = await authClient
      .from("profiles")
      .select("denomination, life_challenge, spiritual_maturity")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Profil non trouvé" }, { status: 404 });
    }

    // Appeler la logique POST interne avec les données du profil
    const mockRequest = {
      json: async () => ({
        denomination: profile.denomination,
        life_challenge: profile.life_challenge,
        spiritual_maturity: profile.spiritual_maturity
      })
    } as Request;

    // Rediriger vers POST
    return POST(mockRequest);

  } catch (error) {
    console.error("Error fetching reading plan:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du plan de lecture" },
      { status: 500 }
    );
  }
}
