'use strict';

/*
 * Shared translation table used by BOTH the Electron main process (CommonJS)
 * and the renderer (loaded as a plain <script>, exposed as window.LaesI18n).
 *
 * Keys are flat. Use {placeholders} for interpolation. When a key is missing in
 * the active language we fall back to English, then to the key itself.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LaesI18n = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const en = {
    /* ---- app chrome ---- */
    'app.brand': 'Local AI Experts Sync',
    'app.siteLink': 'Local AI Experts — local-ai-experts.com',
    'app.starting': 'Starting up…',
    'app.gitVersionHint': 'Git {version} • {platform}',
    'common.dismiss': 'Dismiss',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.refresh': 'Refresh',
    'common.language': 'Language',
    'dialog.pickFolder.title': 'Choose a project folder',
    'dialog.pickKey.title': 'Choose your SSH private key',

    /* ---- settings ---- */
    'settings.button': 'Settings',
    'settings.title': 'App settings',
    'settings.subtitle': 'Change how the app looks and behaves.',
    'settings.language.label': 'Language',
    'settings.language.help': 'Choose the language used across the app.',
    'settings.about.title': 'About',
    'settings.about.app': 'App version',
    'settings.about.git': 'Git version',
    'settings.about.platform': 'System',
    'settings.close': 'Close',
    'settings.blockPull.label': 'Block Pull when there are local changes',
    'settings.blockPull.help':
      'Recommended for beginners: this avoids unexpected conflicts by refusing to download while you still have unsaved changes. Uncheck it if you prefer to Pull anyway.',

    /* ---- language chooser ---- */
    'lang.title': 'Choose your language',
    'lang.subtitle': 'You can change this at any time from the top bar.',
    'lang.english': 'English',
    'lang.french': 'Français',
    'lang.continue': 'Continue',

    /* ---- platform names ---- */
    'platform.windows': 'Windows',
    'platform.macos': 'macOS',
    'platform.linux': 'Linux',

    /* ---- git missing ---- */
    'git.title': 'One quick setup step',
    'git.intro':
      'This app needs a free tool called Git to save and share your projects. Git was not found on your computer yet. It only takes a minute to install.',
    'git.steps.win.1': 'Click "Download Git for Windows" below.',
    'git.steps.win.2': 'Run the downloaded file and keep clicking "Next" (the default options are fine).',
    'git.steps.win.3': 'When it finishes, come back here and click "I installed it — check again".',
    'git.steps.mac.1':
      'The easiest way: open the Terminal app, type  git --version  and press Enter. macOS will offer to install the developer tools for you.',
    'git.steps.mac.2': 'Or click "Get Git for macOS" below to download the installer.',
    'git.steps.mac.3': 'When it finishes, come back here and click "I installed it — check again".',
    'git.steps.linux.1':
      'Open your app store or terminal and install the package named "git" (for example: sudo apt install git).',
    'git.steps.linux.2': 'Or click "Get Git for Linux" below for instructions for your distribution.',
    'git.steps.linux.3': 'When it finishes, come back here and click "I installed it — check again".',
    'git.downloadButton': 'Get Git for {platform}',
    'git.recheck': 'I installed it — check again',

    /* ---- welcome ---- */
    'welcome.title': "Welcome! Let's sync your projects",
    'welcome.intro':
      "This app helps you save your work to a server and get other people's changes, without needing to learn Git commands.",
    'welcome.step1': 'Click + Add and choose a project folder on your computer.',
    'welcome.step2': 'Paste the server address and set up your sign-in once.',
    'welcome.step3': 'Use Pull to get changes and Push to send your work.',
    'welcome.addButton': '+ Add a project',

    /* ---- sidebar ---- */
    'sidebar.title': 'Your projects',
    'sidebar.add': '+ Add',
    'sidebar.empty': 'No projects yet. Click + Add to choose a folder on your computer.',
    'legend.title': 'Legend',
    'legend.upToDate': 'Up to date',
    'legend.unpushed': 'Changes to push',
    'legend.toPull': 'Changes to pull',
    'legend.missing': 'Project not found',

    /* ---- project view ---- */
    'project.tab.config': 'Git configuration',
    'project.tab.sync': 'Sync',
    'project.tab.project': 'Project',
    'project.notValidated': 'Set up how to sign in below, then click "Verify authentication".',
    'project.verify.title': 'Check the connection',
    'project.verify.sub': 'We will try to reach the server with your settings. If it works, your project is ready to sync.',
    'project.verify.button': 'Verify authentication',
    'project.pull': 'Pull',
    'project.pullDesc': 'Download the newest changes from the server',
    'project.pullBlocked.short': 'Not available now',
    'project.pullBlocked.detail':
      'Pull is blocked because you have local changes. Push your changes first (or turn off this safety option in Settings).',
    'project.push': 'Push',
    'project.pushDesc': 'Send your changes up to the server',

    'files.title': 'Your files',
    'files.sub': 'These are the changes on your computer that Git has noticed.',
    'files.none': 'No local changes right now.',
    'files.checking': 'Checking…',
    'files.branch': 'Branch:',
    'files.serverBranch': 'Server branch:',
    'files.notConnected': 'Not connected to the server branch yet',
    'files.newerOnServer': 'Newer on server:',
    'files.waitingUpload': 'Waiting to upload:',

    'server.title': 'Git server address',
    'server.sub': 'The web address (remote URL) of your project. Ask whoever set up your project if you are unsure.',
    'server.placeholder': 'https://github.com/you/your-project.git or git@github.com:you/your-project.git',
    'server.save': 'Save',
    'server.test': 'Test connection',
    'server.tip': 'Tip: it usually ends with .git. You can copy it from the "Clone" button on your project web page.',

    'auth.title': 'How to sign in',
    'auth.sub':
      'Choose the method your server expects. If you are not sure, try "Access token" for GitHub/GitLab, or "SSH key" if someone gave you a key.',
    'auth.none.title': 'No sign-in needed',
    'auth.none.desc': 'For public projects, or when you already use Git on this computer with saved sign-in.',
    'auth.system.title': "Use this computer's Git configuration (recommended)",
    'auth.system.desc':
      'Uses the sign-in already set up on this computer (global and project Git settings). Nothing extra to enter.',
    'auth.ssh.title': 'SSH key (recommended for teams)',
    'auth.ssh.desc': 'Uses a key file on your computer. Leave the file empty to use your normal system keys.',
    'auth.token.title': 'Access token',
    'auth.token.desc': "A long code you create on your server's website. Safer than a password.",
    'auth.password.title': 'Username and password',
    'auth.password.desc': 'Only if your server still uses passwords (many servers no longer allow this).',
    'auth.sshKey.label': 'SSH key file (optional)',
    'auth.sshKey.placeholder': 'Leave empty to use your system SSH keys',
    'auth.sshKey.choose': 'Choose file…',
    'auth.sshKey.help': 'If you pasted a key into this app, choose that file here. Otherwise leave empty.',
    'auth.username.label': 'Username (optional)',
    'auth.username.placeholder': 'your username',
    'auth.token.label': 'Access token',
    'auth.token.placeholder': 'paste your token',
    'auth.password.label': 'Password',
    'auth.password.placeholder': 'your password',
    'auth.secret.revealNote': 'Your secret is stored securely on this computer and never shown again.',
    'auth.secret.savedNote': 'A secret is already saved.',
    'auth.secret.remove': 'Remove saved secret',
    'auth.encryptionWarning':
      'Heads up: your system keychain is not available, so saved passwords are only lightly protected. Prefer an SSH key or token if you can.',
    'auth.save': 'Save sign-in method',
    'auth.test': 'Test connection',

    'identity.title': 'Your identity',
    'identity.sub':
      "The name and email saved with each of your changes. We keep them in this computer's Git configuration and read them again every time the app starts.",
    'identity.name': 'Your name',
    'identity.email': 'Your email',
    'identity.namePlaceholder': 'Jane Doe',
    'identity.emailPlaceholder': 'jane@example.com',
    'identity.save': 'Save identity',
    'identity.errorRequired': 'Please enter both your name and your email.',
    'identity.setup.title': 'Who are you?',
    'identity.setup.intro':
      'Git saves a name and email with each change so your teammates know who did what. This is set once for all your projects.',
    'identity.setup.save': 'Save and continue',
    'identity.setup.later': 'Set this up later',

    'thisproject.title': 'This project',
    'thisproject.folder': 'Folder on your computer',
    'thisproject.open': 'Open folder',
    'thisproject.remove': 'Remove from this app',
    'thisproject.removeNote': 'Removing a project here never deletes your files or any Git data on the computer.',

    /* ---- change tags ---- */
    'change.new': 'New',
    'change.added': 'Added',
    'change.modified': 'Edited',
    'change.deleted': 'Deleted',
    'change.renamed': 'Renamed',
    'change.conflict': 'Attention',
    'change.changed': 'Changed',

    /* ---- add project modal ---- */
    'add.title': 'Add a project',
    'add.sub': 'Pick a folder on your computer. If it is already a Git project, we will detect that automatically.',
    'add.folder': 'Project folder',
    'add.noFolderChosen': 'No folder chosen yet',
    'add.choose': 'Choose folder…',
    'add.name': 'Project name',
    'add.namePlaceholder': 'My project',
    'add.remote': 'Server address (optional for now)',
    'add.remotePlaceholder': 'https://… or git@…',
    'add.remoteHelp': "You can also add this later in the project's settings.",
    'add.yourName': 'Your name (optional)',
    'add.yourEmail': 'Your email (optional)',
    'add.submit': 'Add project',
    'add.errorChooseFolder': 'Please choose a folder first.',
    'add.alreadyGit.title': 'This folder is already a Git project.',
    'add.alreadyGit.withRemote': 'We found its server address and filled it in below.',
    'add.alreadyGit.noRemote': 'No server address is set yet — you can add one below.',

    /* ---- push modal ---- */
    'push.title': 'Describe your changes',
    'push.sub': 'Write a short note about what you changed. This helps everyone understand the update.',
    'push.placeholder': 'Example: Updated the project files',
    'push.help': 'You have {count} change(s) ready to send.',
    'push.submit': 'Save & Push',

    /* ---- delete confirm ---- */
    'delete.title': 'Remove this project?',
    'delete.sub': 'No project data is deleted. This only removes the shortcut inside this app — your files and the Git history on the computer stay exactly as they are.',
    'delete.confirm': 'Yes, remove',

    /* ---- renderer banners ---- */
    'banner.couldNotSave.title': 'Could not save',
    'banner.folderReady.title': 'Folder is ready',
    'banner.folderReady.detail':
      'We prepared this folder for saving and sharing. Next, add the server address in "Server address" and click "Test connection".',
    'banner.projectAdded.title': 'Project added',
    'banner.projectAdded.detail': 'Next, add the server address in "Server address" so you can Pull and Push.',
    'banner.projectRemoved.title': 'Project removed from this app',
    'banner.projectRemoved.detail': 'Your files were not deleted — only the shortcut inside this app was removed.',
    'banner.remoteSaved.title': 'Server address saved',
    'banner.remoteSaved.detail': 'Click "Verify authentication" to make sure it works.',
    'banner.identitySaved.title': 'Identity saved',
    'banner.identitySaved.detail': 'Your changes will now be labelled with this name and email.',
    'banner.authSaved.title': 'Sign-in method saved',
    'banner.authSaved.detail': 'Click "Verify authentication" to make sure the server accepts it.',
    'banner.authValidated.title': 'Authentication verified',
    'banner.authValidated.detail': 'Everything works. We moved you to the Sync tab.',
    'banner.secretCleared.title': 'Saved secret cleared',
    'banner.secretCleared.detail': 'The stored password or token was removed.',
    'banner.alreadyGit.title': 'Project added',
    'banner.alreadyGit.detail': 'This folder was already a Git project. We found its existing server address.',
    'banner.alreadyGit.noRemote': 'This folder was already a Git project, but no server address is set yet. Add one in "Server address".',

    /* ---- main-process messages ---- */
    'main.auth.title': "We couldn't sign in to the server",
    'main.auth.detail':
      'The server did not accept your login details. Open the Credentials section and double-check your token, username/password, or SSH key. For tokens, make sure it has not expired and has permission to read and write.',
    'main.network.title': "We couldn't reach the server",
    'main.network.detail': 'Check your internet connection, and confirm the web address (remote URL) is spelled correctly.',
    'main.needPull.title': 'The server has changes you do not have yet',
    'main.needPull.detail': 'Click "Pull" first to download the latest changes, then click "Push" again.',
    'main.conflict.title': 'Some files changed on both sides',
    'main.conflict.detail':
      'The same file was edited on your computer and on the server. This needs a careful look. A good first step is to copy your edited files somewhere safe, then Pull, then re-apply your changes.',
    'main.identity.title': 'Your name and email are not set',
    'main.identity.detail':
      'Git needs a name and email to label your changes. Open the app Settings and fill them in, then try again.',
    'main.noUpstream.title': 'This project is not connected to the server branch yet',
    'main.noUpstream.detail':
      'Click "Push" and we will connect it and upload your changes to the server. If the server already has content, click "Pull" first instead.',
    'main.repoNotFound.title': "We couldn't find the project on the server",
    'main.repoNotFound.detail':
      'The remote URL may be wrong, or your account may not have access to it. Check the web address in "Server address".',
    'main.emptyRepo.title': 'You have not saved any changes yet',
    'main.emptyRepo.detail': 'Write a short description of what you changed, then click "Push" to upload it.',
    'main.nothingToCommit.title': 'No changes to save',
    'main.nothingToCommit.detail': 'Everything on your computer is already up to date with the last saved version.',
    'main.generic.title': 'Something went wrong',
    'main.generic.detail': 'We could not complete that action. Please try again.',

    'main.status.checking.title': 'Checking your project…',
    'main.status.checking.detail': 'One moment while we look at your files.',
    'main.status.notConnectedHasChanges.title': 'You have changes that are not saved to the server yet',
    'main.status.notConnectedHasChanges.detail':
      'We found {count} change(s) on your computer. Click "Push" to upload them to the server.',
    'main.status.notConnectedClean.title': 'This project is not connected to the server branch yet',
    'main.status.notConnectedClean.detail': 'Click "Pull" to download existing content, or "Push" to upload your files.',
    'main.status.bothChanged.title': 'Both you and the server have changes',
    'main.status.bothChanged.detail':
      'You have {count} unsaved change(s), and the server has {behind} newer change(s). Click "Pull" first (we will save your work safely), then "Push" to upload.',
    'main.status.behind.title': 'New changes are available on the server',
    'main.status.behind.detail': 'The server has {behind} newer change(s). Click "Pull" to download them.',
    'main.status.aheadOrChanges.title': 'You have changes that are not on the server yet',
    'main.status.aheadOrChanges.detail':
      'There are {count} unsaved change(s) on your computer. Click "Push" to upload them to the server.',
    'main.status.upToDate.title': 'Everything is up to date',
    'main.status.upToDate.detail': 'Your files match what is saved on the server. Nothing to do right now.',

    'main.connected.title': 'Connected successfully',
    'main.connected.detail': 'Your computer can talk to the server and sign in correctly. You can Pull and Push now.',
    'main.noRemote.title': 'No server address yet',
    'main.noRemote.detail': 'Add the web address of your project (remote URL) first.',
    'main.serverChecked.title': 'Server checked',
    'main.serverChecked.detail': 'We looked for new changes on the server.',
    'main.pulled.title': 'Downloaded the latest changes',
    'main.pulled.detail': 'Your folder now matches the server. You can open your files and start working.',
    'main.pushed.title': 'Uploaded to the server',
    'main.pushed.detail': 'Your changes are now saved on the server for everyone to see.',
    'main.alreadyUpToDate.title': 'Already up to date',
    'main.alreadyUpToDate.detail': 'There is nothing new to upload. The server already has your latest changes.',
    'main.notSavedYet.title': 'You have not saved any changes yet',
    'main.notSavedYet.detail': 'Add or edit some files in your project, then click "Push" and we will upload them.',
    'main.savedLocally.title': 'Saved on your computer',
    'main.savedLocally.detail': 'Your changes are saved locally. Click "Push" to upload them to the server.',
    'main.defaultCommitMessage': 'Update from {date}',
    'main.autoSaveCommit': 'Auto-saved changes before download',

    'main.err.noFolder.title': 'No folder chosen',
    'main.err.noFolder.detail': 'Please choose a folder first.',
    'main.err.folderNotFound.title': 'Folder not found',
    'main.err.folderNotFound.detail': 'That folder does not exist on this computer.',
    'main.err.notFolder.title': 'Not a folder',
    'main.err.notFolder.detail': 'Please choose a folder, not a file.',
    'main.err.setupFolder.title': "We couldn't set up this folder",
    'main.err.saveAddress.title': "We couldn't save the server address",
    'main.err.init.title': "We couldn't initialise this folder",
    'main.err.readProject.title': "We couldn't read your project",
    'main.err.connect.title': "We couldn't connect to the server",
    'main.err.checkServer.title': "We couldn't check the server",
    'main.err.download.title': "We couldn't download the changes",
    'main.err.prepareChanges.title': "We couldn't prepare your changes",
    'main.err.saveChanges.title': "We couldn't save your changes",
    'main.err.upload.title': "We couldn't upload your changes",
    'main.err.pullFirst.detail': 'Click "Pull" first to download the latest changes, then click "Push" again.',
    'main.pullBlocked.title': 'Pull is blocked',
    'main.pullBlocked.detail':
      'Pull is blocked because you have local changes. Push your changes first (or turn off this safety option in Settings).',

    /* ---- test harness strings ---- */
    'test.hello': 'Hello',
  };

  const fr = {
    /* ---- app chrome ---- */
    'app.brand': 'Local AI Experts Sync',
    'app.siteLink': 'Local AI Experts — local-ai-experts.com',
    'app.starting': 'Démarrage…',
    'app.gitVersionHint': 'Git {version} • {platform}',
    'common.dismiss': 'Fermer',
    'common.cancel': 'Annuler',
    'common.save': 'Enregistrer',
    'common.refresh': 'Actualiser',
    'common.language': 'Langue',
    'dialog.pickFolder.title': 'Choisir un dossier de projet',
    'dialog.pickKey.title': 'Choisir votre clé privée SSH',

    /* ---- settings ---- */
    'settings.button': 'Paramètres',
    'settings.title': "Paramètres de l'application",
    'settings.subtitle': "Modifiez l'apparence et le comportement de l'application.",
    'settings.language.label': 'Langue',
    'settings.language.help': "Choisissez la langue utilisée dans toute l'application.",
    'settings.about.title': 'À propos',
    'settings.about.app': "Version de l'application",
    'settings.about.git': 'Version de Git',
    'settings.about.platform': 'Système',
    'settings.close': 'Fermer',
    'settings.blockPull.label': 'Interdire Récupérer en cas de modifications locales',
    'settings.blockPull.help':
      'Recommandé pour les débutants : cela évite les conflits imprévus en refusant le téléchargement tant que vous avez des modifications non enregistrées. Décochez si vous préférez Récupérer quand même.',

    /* ---- language chooser ---- */
    'lang.title': 'Choisissez votre langue',
    'lang.subtitle': 'Vous pourrez la changer à tout moment depuis la barre du haut.',
    'lang.english': 'English',
    'lang.french': 'Français',
    'lang.continue': 'Continuer',

    /* ---- platform names ---- */
    'platform.windows': 'Windows',
    'platform.macos': 'macOS',
    'platform.linux': 'Linux',

    /* ---- git missing ---- */
    'git.title': 'Une petite étape de configuration',
    'git.intro':
      "Cette application a besoin d'un outil gratuit appelé Git pour enregistrer et partager vos projets. Git n'a pas encore été trouvé sur votre ordinateur. L'installation ne prend qu'une minute.",
    'git.steps.win.1': 'Cliquez sur « Télécharger Git pour Windows » ci-dessous.',
    'git.steps.win.2': "Lancez le fichier téléchargé et cliquez sur « Suivant » (les options par défaut conviennent).",
    'git.steps.win.3': 'Une fois terminé, revenez ici et cliquez sur « Je l\u2019ai installé — vérifier à nouveau ».',
    'git.steps.mac.1':
      "Le plus simple : ouvrez l'application Terminal, tapez  git --version  puis appuyez sur Entrée. macOS vous proposera d'installer les outils de développement.",
    'git.steps.mac.2': 'Ou cliquez sur « Obtenir Git pour macOS » ci-dessous pour télécharger l\u2019installeur.',
    'git.steps.mac.3': 'Une fois terminé, revenez ici et cliquez sur « Je l\u2019ai installé — vérifier à nouveau ».',
    'git.steps.linux.1':
      'Ouvrez votre logithèque ou un terminal et installez le paquet « git » (par exemple : sudo apt install git).',
    'git.steps.linux.2': 'Ou cliquez sur « Obtenir Git pour Linux » ci-dessous pour les instructions selon votre distribution.',
    'git.steps.linux.3': 'Une fois terminé, revenez ici et cliquez sur « Je l\u2019ai installé — vérifier à nouveau ».',
    'git.downloadButton': 'Obtenir Git pour {platform}',
    'git.recheck': "Je l'ai installé — vérifier à nouveau",

    /* ---- welcome ---- */
    'welcome.title': 'Bienvenue ! Synchronisons vos projets',
    'welcome.intro':
      "Cette application vous aide à enregistrer votre travail sur un serveur et à récupérer les modifications des autres, sans avoir à apprendre les commandes Git.",
    'welcome.step1': 'Cliquez sur + Ajouter et choisissez un dossier de projet sur votre ordinateur.',
    'welcome.step2': "Collez l'adresse du serveur et configurez votre connexion une seule fois.",
    'welcome.step3': 'Utilisez Récupérer pour obtenir les changements et Envoyer pour partager votre travail.',
    'welcome.addButton': '+ Ajouter un projet',

    /* ---- sidebar ---- */
    'sidebar.title': 'Vos projets',
    'sidebar.add': '+ Ajouter',
    'sidebar.empty': 'Aucun projet pour le moment. Cliquez sur + Ajouter pour choisir un dossier sur votre ordinateur.',
    'legend.title': 'Légende',
    'legend.upToDate': 'À jour',
    'legend.unpushed': 'Modifications à envoyer',
    'legend.toPull': 'Modifications à récupérer',
    'legend.missing': 'Projet introuvable',

    /* ---- project view ---- */
    'project.tab.config': 'Configuration Git',
    'project.tab.sync': 'Synchronisation',
    'project.tab.project': 'Projet',
    'project.notValidated': 'Configurez ci-dessous la méthode de connexion, puis cliquez sur « Vérifier l\u2019authentification ».',
    'project.verify.title': 'Vérifier la connexion',
    'project.verify.sub': 'Nous allons essayer de joindre le serveur avec vos réglages. Si cela fonctionne, votre projet est prêt à être synchronisé.',
    'project.verify.button': 'Vérifier l\u2019authentification',
    'project.pull': 'Récupérer',
    'project.pullDesc': 'Télécharger les dernières modifications depuis le serveur',
    'project.pullBlocked.short': 'Indisponible pour l\'instant',
    'project.pullBlocked.detail':
      'Récupérer est bloqué car vous avez des modifications locales. Envoyez d\'abord vos modifications (ou désactivez cette option de sécurité dans les Paramètres).',
    'project.push': 'Envoyer',
    'project.pushDesc': 'Envoyer vos modifications vers le serveur',

    'files.title': 'Vos fichiers',
    'files.sub': 'Voici les modifications que Git a remarquées sur votre ordinateur.',
    'files.none': 'Aucune modification locale pour le moment.',
    'files.checking': 'Vérification…',
    'files.branch': 'Branche :',
    'files.serverBranch': 'Branche serveur :',
    'files.notConnected': 'Pas encore relié à la branche du serveur',
    'files.newerOnServer': 'Plus récent sur le serveur :',
    'files.waitingUpload': "En attente d'envoi :",

    'server.title': 'Adresse du serveur git',
    'server.sub': "L'adresse web (URL distante) de votre projet. Demandez-la à la personne qui a configuré votre projet si vous avez un doute.",
    'server.placeholder': 'https://github.com/vous/votre-projet.git ou git@github.com:vous/votre-projet.git',
    'server.save': 'Enregistrer',
    'server.test': 'Tester la connexion',
    'server.tip': "Astuce : elle se termine généralement par .git. Vous pouvez la copier depuis le bouton « Clone » de la page web de votre projet.",

    'auth.title': 'Comment se connecter',
    'auth.sub':
      'Choisissez la méthode attendue par votre serveur. En cas de doute, essayez « Jeton d\u2019accès » pour GitHub/GitLab, ou « Clé SSH » si une clé vous a été fournie.',
    'auth.none.title': 'Aucune connexion requise',
    'auth.none.desc': 'Pour les projets publics, ou si Git est déjà configuré avec une connexion enregistrée sur cet ordinateur.',
    'auth.system.title': 'Utiliser la configuration Git de cet ordinateur (recommandé)',
    'auth.system.desc':
      'Utilise la connexion déjà configurée sur cet ordinateur (réglages Git globaux et du projet). Rien à saisir de plus.',
    'auth.ssh.title': 'Clé SSH (recommandé pour les équipes)',
    'auth.ssh.desc': 'Utilise un fichier de clé sur votre ordinateur. Laissez vide pour utiliser vos clés système habituelles.',
    'auth.token.title': "Jeton d'accès",
    'auth.token.desc': 'Un long code que vous créez sur le site de votre serveur. Plus sûr qu\u2019un mot de passe.',
    'auth.password.title': "Nom d'utilisateur et mot de passe",
    'auth.password.desc': 'Uniquement si votre serveur accepte encore les mots de passe (beaucoup ne le permettent plus).',
    'auth.sshKey.label': 'Fichier de clé SSH (facultatif)',
    'auth.sshKey.placeholder': 'Laissez vide pour utiliser vos clés SSH système',
    'auth.sshKey.choose': 'Choisir un fichier…',
    'auth.sshKey.help': 'Si vous avez collé une clé dans cette application, choisissez ce fichier ici. Sinon, laissez vide.',
    'auth.username.label': "Nom d'utilisateur (facultatif)",
    'auth.username.placeholder': 'votre nom d\u2019utilisateur',
    'auth.token.label': "Jeton d'accès",
    'auth.token.placeholder': 'collez votre jeton',
    'auth.password.label': 'Mot de passe',
    'auth.password.placeholder': 'votre mot de passe',
    'auth.secret.revealNote': "Votre secret est stocké en toute sécurité sur cet ordinateur et ne sera plus jamais affiché.",
    'auth.secret.savedNote': 'Un secret est déjà enregistré.',
    'auth.secret.remove': 'Supprimer le secret enregistré',
    'auth.encryptionWarning':
      "Attention : le trousseau de votre système n'est pas disponible, les mots de passe enregistrés ne sont donc que légèrement protégés. Préférez une clé SSH ou un jeton si possible.",
    'auth.save': 'Enregistrer la méthode de connexion',
    'auth.test': 'Tester la connexion',

    'identity.title': 'Votre identité',
    'identity.sub':
      "Le nom et l\u2019e-mail associés à chacune de vos modifications. Ils sont enregistrés dans la configuration Git de cet ordinateur et relus à chaque démarrage de l\u2019application.",
    'identity.name': 'Votre nom',
    'identity.email': 'Votre e-mail',
    'identity.namePlaceholder': 'Jane Doe',
    'identity.emailPlaceholder': 'jane@example.com',
    'identity.save': 'Enregistrer l\u2019identité',
    'identity.errorRequired': 'Veuillez saisir votre nom et votre e-mail.',
    'identity.setup.title': 'Qui êtes-vous ?',
    'identity.setup.intro':
      'Git associe un nom et un e-mail à chaque modification pour que vos collègues sachent qui a fait quoi. Cela se définit une fois pour tous vos projets.',
    'identity.setup.save': 'Enregistrer et continuer',
    'identity.setup.later': 'Configurer plus tard',

    'thisproject.title': 'Ce projet',
    'thisproject.folder': 'Dossier sur votre ordinateur',
    'thisproject.open': 'Ouvrir le dossier',
    'thisproject.remove': 'Retirer de cette application',
    'thisproject.removeNote': 'Retirer un projet ici ne supprime jamais vos fichiers ni aucune donnée Git sur l\u2019ordinateur.',

    /* ---- change tags ---- */
    'change.new': 'Nouveau',
    'change.added': 'Ajouté',
    'change.modified': 'Modifié',
    'change.deleted': 'Supprimé',
    'change.renamed': 'Renommé',
    'change.conflict': 'Attention',
    'change.changed': 'Modifié',

    /* ---- add project modal ---- */
    'add.title': 'Ajouter un projet',
    'add.sub': "Choisissez un dossier sur votre ordinateur. S'il s'agit déjà d'un projet Git, nous le détecterons automatiquement.",
    'add.folder': 'Dossier du projet',
    'add.noFolderChosen': 'Aucun dossier choisi',
    'add.choose': 'Choisir un dossier…',
    'add.name': 'Nom du projet',
    'add.namePlaceholder': 'Mon projet',
    'add.remote': 'Adresse du serveur (facultatif pour l\u2019instant)',
    'add.remotePlaceholder': 'https://… ou git@…',
    'add.remoteHelp': 'Vous pourrez aussi l\u2019ajouter plus tard dans les réglages du projet.',
    'add.yourName': 'Votre nom (facultatif)',
    'add.yourEmail': 'Votre e-mail (facultatif)',
    'add.submit': 'Ajouter le projet',
    'add.errorChooseFolder': 'Veuillez d\u2019abord choisir un dossier.',
    'add.alreadyGit.title': 'Ce dossier est déjà un projet Git.',
    'add.alreadyGit.withRemote': 'Nous avons trouvé son adresse de serveur et l\u2019avons remplie ci-dessous.',
    'add.alreadyGit.noRemote': 'Aucune adresse de serveur n\u2019est encore définie — vous pouvez en ajouter une ci-dessous.',

    /* ---- push modal ---- */
    'push.title': 'Décrivez vos modifications',
    'push.sub': 'Écrivez une courte note sur ce que vous avez modifié. Cela aide chacun à comprendre la mise à jour.',
    'push.placeholder': 'Exemple : Mise à jour des fichiers du projet',
    'push.help': 'Vous avez {count} modification(s) prête(s) à être envoyée(s).',
    'push.submit': 'Enregistrer et envoyer',

    /* ---- delete confirm ---- */
    'delete.title': 'Retirer ce projet ?',
    'delete.sub': 'Aucune donnée du projet n\u2019est supprimée. Cela retire uniquement le raccourci dans cette application — vos fichiers et l\u2019historique Git sur l\u2019ordinateur restent intacts.',
    'delete.confirm': 'Oui, retirer',

    /* ---- renderer banners ---- */
    'banner.couldNotSave.title': 'Enregistrement impossible',
    'banner.folderReady.title': 'Le dossier est prêt',
    'banner.folderReady.detail':
      'Nous avons préparé ce dossier pour l\u2019enregistrement et le partage. Ajoutez ensuite l\u2019adresse du serveur dans « Adresse du serveur » et cliquez sur « Tester la connexion ».',
    'banner.projectAdded.title': 'Projet ajouté',
    'banner.projectAdded.detail': 'Ajoutez ensuite l\u2019adresse du serveur dans « Adresse du serveur » pour pouvoir Récupérer et Envoyer.',
    'banner.projectRemoved.title': 'Projet retiré de cette application',
    'banner.projectRemoved.detail': 'Vos fichiers n\u2019ont pas été supprimés — seul le raccourci dans cette application a été retiré.',
    'banner.remoteSaved.title': 'Adresse du serveur enregistrée',
    'banner.remoteSaved.detail': 'Cliquez sur « Vérifier l\u2019authentification » pour vous assurer que cela fonctionne.',
    'banner.identitySaved.title': 'Identité enregistrée',
    'banner.identitySaved.detail': 'Vos modifications seront désormais étiquetées avec ce nom et cet e-mail.',
    'banner.authSaved.title': 'Méthode de connexion enregistrée',
    'banner.authSaved.detail': 'Cliquez sur « Vérifier l\u2019authentification » pour vous assurer que le serveur l\u2019accepte.',
    'banner.authValidated.title': 'Authentification vérifiée',
    'banner.authValidated.detail': 'Tout fonctionne. Nous vous avons basculé vers l\u2019onglet Synchronisation.',
    'banner.secretCleared.title': 'Secret enregistré supprimé',
    'banner.secretCleared.detail': 'Le mot de passe ou jeton enregistré a été supprimé.',
    'banner.alreadyGit.title': 'Projet ajouté',
    'banner.alreadyGit.detail': 'Ce dossier était déjà un projet Git. Nous avons récupéré son adresse de serveur existante.',
    'banner.alreadyGit.noRemote': 'Ce dossier était déjà un projet Git, mais aucune adresse de serveur n\u2019est définie. Ajoutez-en une dans « Adresse du serveur ».',

    /* ---- main-process messages ---- */
    'main.auth.title': 'Nous n\u2019avons pas pu nous connecter au serveur',
    'main.auth.detail':
      'Le serveur n\u2019a pas accepté vos identifiants. Ouvrez la section « Comment se connecter » et vérifiez votre jeton, vos identifiants ou votre clé SSH. Pour un jeton, assurez-vous qu\u2019il n\u2019a pas expiré et qu\u2019il autorise la lecture et l\u2019écriture.',
    'main.network.title': 'Nous n\u2019avons pas pu joindre le serveur',
    'main.network.detail': 'Vérifiez votre connexion Internet et assurez-vous que l\u2019adresse web (URL distante) est correctement orthographiée.',
    'main.needPull.title': 'Le serveur a des modifications que vous n\u2019avez pas encore',
    'main.needPull.detail': 'Cliquez d\u2019abord sur « Récupérer » pour télécharger les dernières modifications, puis cliquez à nouveau sur « Envoyer ».',
    'main.conflict.title': 'Certains fichiers ont été modifiés des deux côtés',
    'main.conflict.detail':
      'Le même fichier a été modifié sur votre ordinateur et sur le serveur. Cela demande une vérification attentive. Commencez par copier vos fichiers modifiés en lieu sûr, puis Récupérez, puis réappliquez vos modifications.',
    'main.identity.title': 'Votre nom et votre e-mail ne sont pas définis',
    'main.identity.detail':
      'Git a besoin d\u2019un nom et d\u2019un e-mail pour étiqueter vos modifications. Ouvrez les Paramètres de l\u2019application, renseignez-les, puis réessayez.',
    'main.noUpstream.title': 'Ce projet n\u2019est pas encore relié à la branche du serveur',
    'main.noUpstream.detail':
      'Cliquez sur « Envoyer » : nous allons le relier et envoyer vos modifications au serveur. Si le serveur contient déjà des fichiers, cliquez plutôt sur « Récupérer ».',
    'main.repoNotFound.title': 'Nous n\u2019avons pas trouvé le projet sur le serveur',
    'main.repoNotFound.detail':
      'L\u2019URL distante est peut-être incorrecte, ou votre compte n\u2019y a pas accès. Vérifiez l\u2019adresse web dans « Adresse du serveur ».',
    'main.emptyRepo.title': 'Vous n\u2019avez encore rien enregistré',
    'main.emptyRepo.detail': 'Écrivez une courte description de vos modifications, puis cliquez sur « Envoyer » pour les téléverser.',
    'main.nothingToCommit.title': 'Aucune modification à enregistrer',
    'main.nothingToCommit.detail': 'Tout est déjà à jour sur votre ordinateur par rapport à la dernière version enregistrée.',
    'main.generic.title': 'Une erreur est survenue',
    'main.generic.detail': 'Nous n\u2019avons pas pu terminer cette action. Veuillez réessayer.',

    'main.status.checking.title': 'Vérification de votre projet…',
    'main.status.checking.detail': 'Un instant, nous regardons vos fichiers.',
    'main.status.notConnectedHasChanges.title': 'Vous avez des modifications non enregistrées sur le serveur',
    'main.status.notConnectedHasChanges.detail':
      'Nous avons repéré {count} modification(s) sur votre ordinateur. Cliquez sur « Envoyer » pour les téléverser vers le serveur.',
    'main.status.notConnectedClean.title': 'Ce projet n\u2019est pas encore relié à la branche du serveur',
    'main.status.notConnectedClean.detail': 'Cliquez sur « Récupérer » pour télécharger le contenu existant, ou sur « Envoyer » pour téléverser vos fichiers.',
    'main.status.bothChanged.title': 'Vous et le serveur avez des modifications',
    'main.status.bothChanged.detail':
      'Vous avez {count} modification(s) non enregistrée(s), et le serveur en a {behind} plus récente(s). Cliquez d\u2019abord sur « Récupérer » (nous sauvegarderons votre travail), puis sur « Envoyer ».',
    'main.status.behind.title': 'De nouvelles modifications sont disponibles sur le serveur',
    'main.status.behind.detail': 'Le serveur a {behind} modification(s) plus récente(s). Cliquez sur « Récupérer » pour les télécharger.',
    'main.status.aheadOrChanges.title': 'Vous avez des modifications qui ne sont pas encore sur le serveur',
    'main.status.aheadOrChanges.detail':
      'Il y a {count} modification(s) non enregistrée(s) sur votre ordinateur. Cliquez sur « Envoyer » pour les téléverser vers le serveur.',
    'main.status.upToDate.title': 'Tout est à jour',
    'main.status.upToDate.detail': 'Vos fichiers correspondent à ce qui est enregistré sur le serveur. Rien à faire pour le moment.',

    'main.connected.title': 'Connexion réussie',
    'main.connected.detail': 'Votre ordinateur communique avec le serveur et la connexion est correcte. Vous pouvez Récupérer et Envoyer.',
    'main.noRemote.title': 'Pas encore d\u2019adresse de serveur',
    'main.noRemote.detail': 'Ajoutez d\u2019abord l\u2019adresse web de votre projet (URL distante).',
    'main.serverChecked.title': 'Serveur vérifié',
    'main.serverChecked.detail': 'Nous avons cherché de nouvelles modifications sur le serveur.',
    'main.pulled.title': 'Dernières modifications téléchargées',
    'main.pulled.detail': 'Votre dossier correspond désormais au serveur. Vous pouvez ouvrir vos fichiers et commencer à travailler.',
    'main.pushed.title': 'Téléversé vers le serveur',
    'main.pushed.detail': 'Vos modifications sont maintenant enregistrées sur le serveur, visibles par tous.',
    'main.alreadyUpToDate.title': 'Déjà à jour',
    'main.alreadyUpToDate.detail': 'Il n\u2019y a rien de nouveau à téléverser. Le serveur a déjà vos dernières modifications.',
    'main.notSavedYet.title': 'Vous n\u2019avez encore rien enregistré',
    'main.notSavedYet.detail': 'Ajoutez ou modifiez des fichiers dans votre projet, puis cliquez sur « Envoyer » et nous les téléverserons.',
    'main.savedLocally.title': 'Enregistré sur votre ordinateur',
    'main.savedLocally.detail': 'Vos modifications sont enregistrées localement. Cliquez sur « Envoyer » pour les téléverser vers le serveur.',
    'main.defaultCommitMessage': 'Mise à jour du {date}',
    'main.autoSaveCommit': 'Modifications sauvegardées automatiquement avant téléchargement',

    'main.err.noFolder.title': 'Aucun dossier choisi',
    'main.err.noFolder.detail': 'Veuillez d\u2019abord choisir un dossier.',
    'main.err.folderNotFound.title': 'Dossier introuvable',
    'main.err.folderNotFound.detail': 'Ce dossier n\u2019existe pas sur cet ordinateur.',
    'main.err.notFolder.title': 'Ce n\u2019est pas un dossier',
    'main.err.notFolder.detail': 'Veuillez choisir un dossier, et non un fichier.',
    'main.err.setupFolder.title': 'Nous n\u2019avons pas pu préparer ce dossier',
    'main.err.saveAddress.title': 'Nous n\u2019avons pas pu enregistrer l\u2019adresse du serveur',
    'main.err.init.title': 'Nous n\u2019avons pas pu initialiser ce dossier',
    'main.err.readProject.title': 'Nous n\u2019avons pas pu lire votre projet',
    'main.err.connect.title': 'Nous n\u2019avons pas pu nous connecter au serveur',
    'main.err.checkServer.title': 'Nous n\u2019avons pas pu vérifier le serveur',
    'main.err.download.title': 'Nous n\u2019avons pas pu télécharger les modifications',
    'main.err.prepareChanges.title': 'Nous n\u2019avons pas pu préparer vos modifications',
    'main.err.saveChanges.title': 'Nous n\u2019avons pas pu enregistrer vos modifications',
    'main.err.upload.title': 'Nous n\u2019avons pas pu téléverser vos modifications',
    'main.err.pullFirst.detail': 'Cliquez d\u2019abord sur « Récupérer » pour télécharger les dernières modifications, puis cliquez à nouveau sur « Envoyer ».',
    'main.pullBlocked.title': 'Récupérer est bloqué',
    'main.pullBlocked.detail':
      'Récupérer est bloqué car vous avez des modifications locales. Envoyez d\u2019abord vos modifications (ou désactivez cette option de sécurité dans les Paramètres).',

    /* ---- test harness strings ---- */
    'test.hello': 'Bonjour',
  };

  const dict = { en, fr };
  const languages = ['en', 'fr'];

  function normalize(locale) {
    const l = String(locale || '').toLowerCase();
    if (l.startsWith('fr')) return 'fr';
    return 'en';
  }

  function t(lang, key, params) {
    const table = dict[lang] || dict.en;
    let value = table[key];
    if (value === undefined) value = dict.en[key];
    if (value === undefined) value = key;
    if (params) {
      value = value.replace(/\{(\w+)\}/g, function (m, name) {
        return params[name] !== undefined ? String(params[name]) : m;
      });
    }
    return value;
  }

  return { t: t, normalize: normalize, languages: languages };
});
