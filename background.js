const extensionAPI = typeof browser !== 'undefined' ? browser : chrome;

// Function to handle errors
function onError(error) {
    console.error(`Error: ${error}`);
}

// Function to handle tab creation
function onCreated(tab) {
    if (tab) {
        console.log(`Created new tab: ${tab.id}`);
        const tabId = tab.id;
        const expirationTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        extensionAPI.storage.local.get("tempTabs", (result) => {
            const tempTabs = result.tempTabs || [];
            tempTabs.push({ id: tabId, expirationTime });
            extensionAPI.storage.local.set({ tempTabs });
            console.log("Tab added to tempTabs with expiration time:", expirationTime);
        });

        // Schedule tab closure
        setTimeout(() => {
            extensionAPI.tabs.remove(tabId, () => {
                console.log("Tab closed with ID:", tabId);
                extensionAPI.storage.local.get("tempTabs", (result) => {
                    const updatedTabs = result.tempTabs.filter(t => t.id !== tabId);
                    extensionAPI.storage.local.set({ tempTabs: updatedTabs });
                    console.log("Updated tempTabs storage after closing tab.");
                });
            });
        }, 24 * 60 * 60 * 1000);
    } else {
        console.error("Failed to create tab.");
    }
}

// Function to create a new temporary tab
function createNewTempTab() {
    let creating = extensionAPI.tabs.create({
        url: "https://example.org"
    });
    creating.then(onCreated, onError).catch(onError);
}

// Listen for the command to create a new temporary tab
extensionAPI.commands.onCommand.addListener((command) => {
    if (command === "create-temp-tab") {
        console.log("Command received: create-temp-tab");
        createNewTempTab();
    }
});

// On extension start, check if any tabs need to be closed
extensionAPI.runtime.onStartup.addListener(() => {
    console.log("Extension started.");
    extensionAPI.storage.local.get("tempTabs", (result) => {
        const tempTabs = result.tempTabs || [];
        const now = Date.now();

        tempTabs.forEach((tab) => {
            if (tab.expirationTime <= now) {
                extensionAPI.tabs.remove(tab.id, () => {
                    console.log("Tab closed on startup with ID:", tab.id);
                    const updatedTabs = tempTabs.filter(t => t.id !== tab.id);
                    extensionAPI.storage.local.set({ tempTabs: updatedTabs });
                    console.log("Updated tempTabs storage after closing tab on startup.");
                });
            }
        });
    });
});
