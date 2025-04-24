// This copied from Quest Viva, for reference only:

class WebPlayer {
    static dotNetHelper;
    static gameId;
    static slotsDialogCanBeClosed = false;

    static setDotNetHelper(value) {
        WebPlayer.dotNetHelper = value;
    }
    
    static setGameId(id) {
        WebPlayer.gameId = id;
    }
    
    static listSaves = async () => {
        return await GameSaver.listSaves();
    }
    
    static loadSlot = async (slot) => {
        return await GameSaver.load(slot);
    }
    
    static initSlotsDialog() {
        const slots = document.getElementById("questVivaSlots");
        slots.addEventListener('cancel', (event) => {
            if (!WebPlayer.slotsDialogCanBeClosed) {
                event.preventDefault();
                slots.focus();
            }
        });

        // workaround for Escape key _still_ closing the dialog
        document.addEventListener('keydown', (e) => {
            const slots = document.getElementById("questVivaSlots");
            if (e.key === 'Escape' && slots.open && !WebPlayer.slotsDialogCanBeClosed) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }
    
    static showSlots(cancellable) {
        const slots = document.getElementById("questVivaSlots");
        WebPlayer.slotsDialogCanBeClosed = cancellable;
        slots.showModal();
    }

    static closeSlots() {
        const slots = document.getElementById("questVivaSlots");
        slots.close();
    }
    
    static closeDebugger() {
        const dialog = document.getElementById("questVivaDebugger");
        dialog.close();
    }
    
    static initUI() {
        initPlayerUI();
    }
    
    static setCanDebug(value) {
        const cmdDebug = document.getElementById("cmdDebug");
        cmdDebug.style.display = value ? "initial" : "none";
    }

    static setCanSave(value) {
        const cmdSave = document.getElementById("cmdSave");
        cmdSave.style.display = value ? "initial" : "none";
        if (!value) {
            window.saveGame = () => addText("Disabled");
        }
    }
    
    static setAnimateScroll(value) {
        _animateScroll = value;
    }
    
    static async sendCommand(command, tickCount, metadata) {
        await WebPlayer.dotNetHelper.invokeMethodAsync("UiSendCommandAsync", command, tickCount, metadata);
        canSendCommand = true;
    }
    
    static runJs(scripts) {
        // We need globalEval so that calls which add functions add them to the global scope.
        // e.g. spondre evals strings like "function blah() { ... }" which need to be in the global scope so
        // they can be called from subsequent evals.
        const globalEval = window.eval;
        for (const script of scripts) {
            try {
                globalEval(script);
            } catch (e) {
                console.error(e);
            }
        }
    }

    static async uiChoice(choice) {
        await WebPlayer.dotNetHelper.invokeMethodAsync("UiChoiceAsync", choice);
    }
    
    static async uiChoiceCancel() {
        await WebPlayer.dotNetHelper.invokeMethodAsync("UiChoiceCancelAsync");
    }
    
    static async uiTick(tickCount) {
        await WebPlayer.dotNetHelper.invokeMethodAsync("UiTickAsync", tickCount);
    }
    
    static async uiEndWait() {
        await WebPlayer.dotNetHelper.invokeMethodAsync("UiEndWaitAsync");
    }
    
    static async uiEndPause() {
        await WebPlayer.dotNetHelper.invokeMethodAsync("UiEndPauseAsync");
    }
    
    static async uiSetQuestionResponse(response) {
        await WebPlayer.dotNetHelper.invokeMethodAsync("UiSetQuestionResponseAsync", response);
    }
    
    static async uiSendEvent(eventName, param) {
        await WebPlayer.dotNetHelper.invokeMethodAsync("UiSendEventAsync", eventName, param);
        canSendCommand = true;
    }
    
    static async uiSaveGame(html) {
        return await WebPlayer.dotNetHelper.invokeMethodAsync("UiSaveGameAsync", html);
    }
}