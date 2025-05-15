"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initChannelMessagingFunctions = void 0;
const identifierUtils_1 = require("./identifierUtils");
const sessionStorageUtils_1 = require("./sessionStorageUtils");
const navTreeUtils_1 = require("./navTreeUtils");
// @ts-ignore
const jquery_1 = __importDefault(require("jquery"));
const lodash_1 = __importDefault(require("lodash"));
const outlineUtils_1 = require("./outlineUtils");
const cssFunctions_1 = require("./cssFunctions");
const constantsAndTypes_1 = require("./constantsAndTypes");
const changeItemFunctions_1 = require("./changeItemFunctions");
const resqUtils_1 = require("./resqUtils");
const tempoElement_1 = require("./tempoElement");
const editTextUtils_1 = require("./editTextUtils");
const DebounceExecutor_1 = require("../utils/DebounceExecutor");
const domUtils_1 = require("./domUtils");
const PIXELS_TO_MOVE_BEFORE_DRAG = 20;
const IMMEDIATELY_REMOVE_POINTER_LOCK = 'IMMEDIATELY_REMOVE_POINTER_LOCK';
const LAST_NAV_TREE_REFRESH_TIME = 'LAST_NAV_TREE_REFRESH_TIME';
// TODO: Change all of this to be a react wrapper library
const initChannelMessagingFunctions = () => {
    // All processes that involves updating the UI should use this runner to avoid triggering a cascade of updates
    let globalUIUpdateRunner = domUtils_1.defaultUIUpdateRunner;
    // @ts-ignore
    String.prototype.hashCode = function () {
        var hash = 0, i, chr;
        if (this.length === 0)
            return hash;
        for (i = 0; i < this.length; i++) {
            chr = this.charCodeAt(i);
            hash = (hash << 5) - hash + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    };
    // We want to make event listeners non-passive, and to do so have to check
    // that browsers support EventListenerOptions in the first place.
    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Safely_detecting_option_support
    let passiveSupported = false;
    const makePassiveEventOption = () => {
        try {
            const options = {
                get passive() {
                    // This function will be called when the browser
                    //   attempts to access the passive property.
                    passiveSupported = true;
                    return false;
                },
            };
            return options;
        }
        catch (err) {
            passiveSupported = false;
            return passiveSupported;
        }
    };
    /**
     * Taken from: https://stackoverflow.com/questions/3219758/detect-changes-in-the-dom
     *
     * Returns the function to disconnect the observer
     */
    const observeDOM = (function () {
        // @ts-ignore
        var MutationObserver = 
        // @ts-ignore
        window.MutationObserver || window.WebKitMutationObserver;
        return function (objs, callback) {
            const filteredObjs = objs.filter((obj) => obj && obj.nodeType === 1);
            if (filteredObjs.length === 0) {
                return domUtils_1.defaultUIUpdateRunner;
            }
            var mutationObserver;
            const uiUpdateRunner = (innerScope) => {
                // Pause the observer
                if (mutationObserver) {
                    mutationObserver.disconnect();
                }
                innerScope();
                // Resume the observer
                if (mutationObserver) {
                    filteredObjs.forEach((obj) => {
                        mutationObserver.observe(obj, {
                            childList: true,
                            subtree: true,
                            attributes: true,
                            attributeOldValue: true,
                        });
                    });
                }
            };
            if (MutationObserver) {
                mutationObserver = new MutationObserver(callback);
                filteredObjs.forEach((obj) => {
                    // have the observer observe foo for changes in children
                    mutationObserver.observe(obj, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeOldValue: true,
                    });
                });
            }
            // browser support fallback
            // @ts-ignore
            else if (window.addEventListener) {
                filteredObjs.forEach((obj) => {
                    obj.addEventListener('DOMNodeInserted', callback, false);
                    obj.addEventListener('DOMNodeRemoved', callback, false);
                });
            }
            return uiUpdateRunner;
        };
    })();
    /**
     * When selecting in normal mode (not meta key), can select one level down, a sibling
     * or a parent of the selected element
     */
    const getSelectableNavNode = (e) => {
        const selectedElementKey = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY);
        const selectedElement = tempoElement_1.TempoElement.fromKey(selectedElementKey);
        const elementKeyToNavNode = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.ELEMENT_KEY_TO_NAV_NODE);
        // Move up the tree until you find the first valid nav node
        let firstNavNode = null;
        let searchNode = e.target;
        while (searchNode && !firstNavNode) {
            firstNavNode =
                elementKeyToNavNode[(0, identifierUtils_1.getElementKeyFromNode)(searchNode) || ''];
            searchNode = searchNode.parentElement;
        }
        if (!firstNavNode) {
            return constantsAndTypes_1.SELECT_OR_HOVER_STORYBOARD;
        }
        const isNavNodeMatch = (navTreeNode) => {
            var _a, _b, _c, _d;
            if (selectedElement.isEmpty()) {
                // This function cannot be called if there is no selected element, see code logic below the function
                throw Error('No selected element when isNavNodeMatch called');
            }
            if (!navTreeNode) {
                return false;
            }
            // If there is no codebase ID it should not be selectable as there is nothing we can do with it
            if (!navTreeNode.tempoElement.codebaseId.startsWith('tempo-') ||
                navTreeNode.tempoElement.codebaseId === navTreeUtils_1.SKIP_ROOT_CODEBASE_ID) {
                return false;
            }
            // If it matches, we already passed all possible children, so re-select it
            if (selectedElement.isEqual(navTreeNode.tempoElement)) {
                return true;
            }
            // Any parent is ok to select
            if (navTreeNode.tempoElement.isParentOf(selectedElement)) {
                return true;
            }
            // Check parents
            // Pick the first parent with a codebase ID
            let parent = navTreeNode.parent;
            while (parent && !parent.tempoElement.codebaseId.startsWith('tempo-')) {
                parent = parent.parent;
            }
            // One level down
            if ((_a = parent === null || parent === void 0 ? void 0 : parent.tempoElement) === null || _a === void 0 ? void 0 : _a.isEqual(selectedElement)) {
                return true;
            }
            // Sibling of any parent
            const selectedNode = elementKeyToNavNode[selectedElement.getKey()];
            if (selectedNode &&
                ((_d = (_c = (_b = navTreeNode.parent) === null || _b === void 0 ? void 0 : _b.children) === null || _c === void 0 ? void 0 : _c.includes) === null || _d === void 0 ? void 0 : _d.call(_c, selectedNode))) {
                return true;
            }
            return false;
        };
        let foundNavNode = null;
        let searchNavNode = firstNavNode;
        while (searchNavNode) {
            if (!selectedElement.isEmpty() && !selectedElement.isStoryboard()) {
                // If there is a selected element key loop from this element up the stack to find the element that is the direct child
                // of the expected selected element, so that you can only hover one level deeper than you've selected
                if (isNavNodeMatch(searchNavNode)) {
                    foundNavNode = searchNavNode;
                    // Exit the loop as we found the node that matches
                    break;
                }
            }
            else {
                // If there is no selected element key, or the selection is the storyboard itself, loop up to the top-most element with a codebase ID
                if (searchNavNode.tempoElement.codebaseId &&
                    searchNavNode.tempoElement.codebaseId.startsWith('tempo-')) {
                    foundNavNode = searchNavNode;
                    // Note: we do not exit the loop here as we want to keep searching for the top-most element
                }
            }
            searchNavNode = searchNavNode.parent;
        }
        return foundNavNode || null;
    };
    const onPointerOver = (e, parentPort, storyboardId, selectBottomMostElement) => {
        const passedThrough = passThroughEventsIfNeeded(e, parentPort, storyboardId);
        const editingTextInfo = (0, editTextUtils_1.getEditingInfo)();
        // Allow on pointer over events if editing (so we can click out)
        if (e.altKey || (passedThrough && !editingTextInfo)) {
            return;
        }
        if ((0, sessionStorageUtils_1.getMemoryStorageItem)('mouseDragContext')) {
            return;
        }
        const currentHoveredKey = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.HOVERED_ELEMENT_KEY);
        const elementKeyToNavNode = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.ELEMENT_KEY_TO_NAV_NODE) || {};
        let hoveredNavNode;
        if (e.metaKey || e.ctrlKey || selectBottomMostElement) {
            const elementKey = (0, identifierUtils_1.getElementKeyFromNode)(e.target);
            hoveredNavNode = elementKeyToNavNode[elementKey];
            // Special case -> this is the top-most node so it should trigger a hover on the storyboard
            if (!hoveredNavNode && e.target.parentNode === document.body) {
                hoveredNavNode = constantsAndTypes_1.SELECT_OR_HOVER_STORYBOARD;
            }
        }
        else {
            hoveredNavNode = getSelectableNavNode(e);
        }
        const currentSelectedKey = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY);
        const currentSelectedElement = tempoElement_1.TempoElement.fromKey(currentSelectedKey);
        // If the user is holding shift, only allow selecting siblings
        if (e.shiftKey && hoveredNavNode && currentSelectedKey) {
            // Trying to select the entire storyboard, allow only if the other selected element is also a storyboard
            if (typeof hoveredNavNode === 'string' &&
                !currentSelectedElement.isStoryboard()) {
                hoveredNavNode = null;
            }
            if (typeof hoveredNavNode !== 'string' &&
                !(hoveredNavNode === null || hoveredNavNode === void 0 ? void 0 : hoveredNavNode.tempoElement.isSiblingOf(currentSelectedElement))) {
                hoveredNavNode = null;
            }
        }
        if (!hoveredNavNode) {
            if (currentHoveredKey !== null) {
                (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.HOVERED_ELEMENT_KEY, null);
                parentPort.postMessage({
                    id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.HOVERED_ELEMENT_KEY,
                    elementKey: null,
                });
                (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
            }
            return;
        }
        if (typeof hoveredNavNode === 'string') {
            if (hoveredNavNode === constantsAndTypes_1.SELECT_OR_HOVER_STORYBOARD) {
                const storyboardKey = tempoElement_1.TempoElement.forStoryboard(storyboardId).getKey();
                if (currentHoveredKey !== storyboardKey) {
                    (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.HOVERED_ELEMENT_KEY, storyboardKey);
                    parentPort.postMessage({
                        id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.HOVERED_ELEMENT_KEY,
                        elementKey: storyboardKey,
                    });
                    (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
                }
            }
            return;
        }
        const tempoElementKey = hoveredNavNode.tempoElement.getKey();
        if (currentHoveredKey !== tempoElementKey) {
            parentPort.postMessage({
                id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.HOVERED_ELEMENT_KEY,
                elementKey: tempoElementKey,
            });
            (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.HOVERED_ELEMENT_KEY, tempoElementKey);
            (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
        }
    };
    const clearHoveredElements = (parentPort, storyboardId) => {
        const currentHoveredKey = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.HOVERED_ELEMENT_KEY);
        if (!currentHoveredKey) {
            return;
        }
        parentPort.postMessage({
            id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.HOVERED_ELEMENT_KEY,
            elementKey: null,
        });
        (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.HOVERED_ELEMENT_KEY, null);
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
    };
    const onPointerMove = (e, parentPort, storyboardId) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        passThroughEventsIfNeeded(e, parentPort, storyboardId);
        // If no buttons are pressed the drag end event may not have correctly triggered
        // reset the drag state
        let mouseDragData = (0, sessionStorageUtils_1.getMemoryStorageItem)('mouseDragContext');
        if (!e.buttons && mouseDragData) {
            (0, sessionStorageUtils_1.setMemoryStorageItem)('mouseDragContext', null);
            if (mouseDragData === null || mouseDragData === void 0 ? void 0 : mouseDragData.dragging) {
                parentPort.postMessage({
                    id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.DRAG_CANCEL_EVENT,
                    event: {},
                });
            }
            mouseDragData = null;
        }
        const importantFields = {
            pageX: e.pageX,
            pageY: e.pageY,
            clientX: e.clientX,
            clientY: e.clientY,
        };
        (0, sessionStorageUtils_1.setMemoryStorageItem)('mousePos', importantFields);
        parentPort.postMessage({
            id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.MOUSE_MOVE_EVENT,
            event: importantFields,
        });
        if (mouseDragData && !mouseDragData.dragging) {
            const zoomPerc = (0, sessionStorageUtils_1.getMemoryStorageItem)('zoomPerc') || 1;
            const totalMovementPixels = Math.abs(mouseDragData.pageX - e.pageX) +
                Math.abs(mouseDragData.pageY - e.pageY);
            // Start the drag event if the user has moved enough
            if (totalMovementPixels >= PIXELS_TO_MOVE_BEFORE_DRAG / zoomPerc) {
                // Reselect the parent if there was one to select
                if (mouseDragData.parentSelectedElementKey) {
                    const elementKeyToNavNode = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.ELEMENT_KEY_TO_NAV_NODE) || {};
                    const navNodeToSelect = elementKeyToNavNode[mouseDragData.parentSelectedElementKey];
                    if (navNodeToSelect) {
                        parentPort.postMessage({
                            id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.SELECTED_ELEMENT_KEY,
                            elementKey: mouseDragData.parentSelectedElementKey,
                            outerHTML: (_a = (0, jquery_1.default)(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${mouseDragData.parentSelectedElementKey}`).get(0)) === null || _a === void 0 ? void 0 : _a.outerHTML,
                        });
                        (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY, mouseDragData.parentSelectedElementKey);
                    }
                }
                const aiContextSelection = (0, sessionStorageUtils_1.getMemoryStorageItem)('aiContext');
                // Don't enable dragging if the AI context is enabled
                if (!aiContextSelection) {
                    (0, sessionStorageUtils_1.setMemoryStorageItem)('mouseDragContext', Object.assign(Object.assign({}, mouseDragData), { dragging: true }));
                    const selectedElementKey = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY);
                    const selectedElement = (0, jquery_1.default)(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${selectedElementKey}`).get(0);
                    // Trigger the drag start event
                    parentPort.postMessage({
                        id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.DRAG_START_EVENT,
                        event: mouseDragData,
                        outerHTML: selectedElement === null || selectedElement === void 0 ? void 0 : selectedElement.outerHTML,
                    });
                    const bodyObject = (0, jquery_1.default)('body').get(0);
                    // HACK: March 8, 2024
                    // Without this workaround events stay inside the iframe so it's not possible to
                    // track mouse movements outside the iframe when clicking & dragging.
                    // Set the pointer lock and immediately remove it so that
                    // the events start to propagate upwards in the outer application.
                    (0, sessionStorageUtils_1.setMemoryStorageItem)(IMMEDIATELY_REMOVE_POINTER_LOCK, true);
                    yield (bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.requestPointerLock());
                }
            }
        }
        if ((0, sessionStorageUtils_1.getMemoryStorageItem)('mouseDragContext')) {
            (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
        }
    });
    const getParentDomElementForNavNode = (navNode) => {
        if (!navNode) {
            return null;
        }
        if (!(navNode === null || navNode === void 0 ? void 0 : navNode.isComponent)) {
            const childDomElement = (0, jquery_1.default)(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${navNode.tempoElement.getKey()}`).get(0);
            return childDomElement === null || childDomElement === void 0 ? void 0 : childDomElement.parentElement;
        }
        // This is the list of real DOM elements that are at the top level of this component
        const elementKeyToLookupList = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.ELEMENT_KEY_TO_LOOKUP_LIST) || {};
        const lookupList = elementKeyToLookupList[navNode.tempoElement.getKey()] || [];
        let childDomElement;
        lookupList.forEach((lookupElementKey) => {
            if (childDomElement) {
                return;
            }
            childDomElement = (0, jquery_1.default)(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${lookupElementKey}`).get(0);
        });
        return childDomElement === null || childDomElement === void 0 ? void 0 : childDomElement.parentElement;
    };
    const onPointerDown = (e, parentPort, storyboardId) => {
        // This variable determines which button was used
        // 1 -> left, 2 -> middle, 3 -> right
        if (e.which !== 1) {
            return;
        }
        // Allow the edit dynamic text button to be clicked
        if ((0, identifierUtils_1.hasClass)(e.target, identifierUtils_1.EDIT_TEXT_BUTTON)) {
            return;
        }
        const passedThrough = passThroughEventsIfNeeded(e, parentPort, storyboardId);
        if (passedThrough) {
            return;
        }
        const selectedElementKey = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY);
        const selectedElement = tempoElement_1.TempoElement.fromKey(selectedElementKey);
        const selectedNavNode = onSelectElement(e, parentPort, storyboardId);
        const useSelectedIfDragging = !selectedElement.isEmpty() &&
            selectedElement.isParentOf(selectedNavNode === null || selectedNavNode === void 0 ? void 0 : selectedNavNode.tempoElement);
        let offsetX, offsetY;
        if (selectedNavNode === null || selectedNavNode === void 0 ? void 0 : selectedNavNode.pageBoundingBox) {
            offsetX =
                selectedNavNode.pageBoundingBox.pageX +
                    selectedNavNode.pageBoundingBox.width / 2 -
                    e.pageX;
            offsetY =
                selectedNavNode.pageBoundingBox.pageY +
                    selectedNavNode.pageBoundingBox.height / 2 -
                    e.pageY;
        }
        const importantFields = {
            pageX: e.pageX,
            pageY: e.pageY,
            // The difference between where the user clicked and the center of the element
            offsetX,
            offsetY,
            // Used to reselect the parent if the user starts to move
            parentSelectedElementKey: useSelectedIfDragging
                ? selectedElementKey
                : null,
        };
        const elementKeyToNavNode = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.ELEMENT_KEY_TO_NAV_NODE) || {};
        // Get the parent element (actual DOM element) that this node is being dragged inside
        // To do this pick one child element that is being dragged (can be multiple children if the node being dragged is a component),
        // and get its parent in the DOM
        const navNodeToUseForDragging = useSelectedIfDragging
            ? elementKeyToNavNode[selectedElementKey]
            : selectedNavNode;
        const parentDomElement = getParentDomElementForNavNode(navNodeToUseForDragging);
        if (parentDomElement) {
            importantFields['selectedParentDisplay'] = (0, cssFunctions_1.cssEval)(parentDomElement, 'display');
            importantFields['selectedParentFlexDirection'] = (0, cssFunctions_1.cssEval)(parentDomElement, 'flex-direction');
        }
        const aiContextSelection = (0, sessionStorageUtils_1.getMemoryStorageItem)('aiContext');
        // Don't enable dragging if the AI context is enabled
        if (!aiContextSelection) {
            (0, sessionStorageUtils_1.setMemoryStorageItem)('mouseDragContext', importantFields);
        }
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
    };
    const onPointerUp = (e, parentPort, storyboardId) => {
        passThroughEventsIfNeeded(e, parentPort, storyboardId);
        const mouseDragData = (0, sessionStorageUtils_1.getMemoryStorageItem)('mouseDragContext');
        (0, sessionStorageUtils_1.setMemoryStorageItem)('mouseDragContext', null);
        if (mouseDragData === null || mouseDragData === void 0 ? void 0 : mouseDragData.dragging) {
            parentPort.postMessage({
                id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.DRAG_END_EVENT,
                event: {},
            });
        }
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
    };
    const onSelectElement = (e, parentPort, storyboardId) => {
        var _a, _b, _c;
        const driveModeEnabled = !!(0, sessionStorageUtils_1.getSessionStorageItem)('driveModeEnabled', storyboardId);
        if (driveModeEnabled) {
            return null;
        }
        const elementKeyToNavNode = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.ELEMENT_KEY_TO_NAV_NODE) || {};
        let selectedNavNode;
        if (e.metaKey || e.ctrlKey) {
            const elementKey = (0, identifierUtils_1.getElementKeyFromNode)(e.target);
            selectedNavNode = elementKeyToNavNode[elementKey];
            // Special case -> this is the top-most node so it should trigger a select on the storyboard
            if (!selectedNavNode && e.target.parentNode === document.body) {
                selectedNavNode = constantsAndTypes_1.SELECT_OR_HOVER_STORYBOARD;
            }
        }
        else {
            selectedNavNode = getSelectableNavNode(e);
        }
        const currentSelectedElementKey = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY);
        // If this is not a valid nav node, it's not something we track - deselect all
        if (!selectedNavNode) {
            if (currentSelectedElementKey) {
                parentPort.postMessage({
                    id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.SELECTED_ELEMENT_KEY,
                    elementKey: null,
                });
                (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY, null);
                (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
            }
            return null;
        }
        const currentSelectedElement = tempoElement_1.TempoElement.fromKey(currentSelectedElementKey);
        const currentMultiSelectedKeys = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.MULTI_SELECTED_ELEMENT_KEYS) || [];
        let newSelectedElement = typeof selectedNavNode === 'string'
            ? tempoElement_1.TempoElement.forStoryboard(storyboardId)
            : selectedNavNode.tempoElement;
        let newMultiSelectKeys = [];
        // If the user is holding shift, check if we can multi-select (something has to be already selected)
        // Note: this logic generally matches the logic in the iframe slice on tempo-web
        if (e.shiftKey && currentSelectedElementKey) {
            // First check if we are deselecting
            const elementToDeselect = currentMultiSelectedKeys
                .map((elementKey) => tempoElement_1.TempoElement.fromKey(elementKey))
                .find((element) => {
                return (element.isParentOf(newSelectedElement) ||
                    element.isEqual(newSelectedElement));
            });
            if (elementToDeselect) {
                newMultiSelectKeys = currentMultiSelectedKeys.filter((elementKey) => {
                    return elementKey !== elementToDeselect.getKey();
                });
                // Pick a new element to be the main selected element
                // Note, if the length is 1, there is logic further down to handle that case explicitly (to exit multiselect mode)
                if (elementToDeselect.isEqual(currentSelectedElement) &&
                    newMultiSelectKeys.length > 1) {
                    parentPort.postMessage({
                        id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.SELECTED_ELEMENT_KEY,
                        elementKey: newMultiSelectKeys[0],
                        outerHTML: (_a = (0, jquery_1.default)(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${newMultiSelectKeys[0]}`).get(0)) === null || _a === void 0 ? void 0 : _a.outerHTML,
                    });
                    (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY, newMultiSelectKeys[0]);
                }
                // Check if we can add this element
            }
            else if (currentSelectedElement.isSiblingOf(newSelectedElement)) {
                if (currentMultiSelectedKeys === null || currentMultiSelectedKeys === void 0 ? void 0 : currentMultiSelectedKeys.length) {
                    newMultiSelectKeys = currentMultiSelectedKeys.concat([
                        newSelectedElement.getKey(),
                    ]);
                }
                else {
                    newMultiSelectKeys = [
                        currentSelectedElementKey,
                        newSelectedElement.getKey(),
                    ];
                }
            }
            else {
                // This case the user is trying to multiselect but it's not something that's allowed, just return but don't make any changes
                return null;
            }
        }
        // In multiselect mode, set the necessary values
        if (newMultiSelectKeys.length > 1) {
            parentPort.postMessage({
                id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.MULTI_SELECTED_ELEMENT_KEYS,
                elementKeys: newMultiSelectKeys,
                outerHTMLs: newMultiSelectKeys === null || newMultiSelectKeys === void 0 ? void 0 : newMultiSelectKeys.map((elementKey) => { var _a; return (_a = (0, jquery_1.default)(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${elementKey}`).get(0)) === null || _a === void 0 ? void 0 : _a.outerHTML; }),
            });
            (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.MULTI_SELECTED_ELEMENT_KEYS, newMultiSelectKeys);
            (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
            (0, editTextUtils_1.teardownEditableText)(parentPort, storyboardId);
            return null; // Cannot perform regular actions on any particular node
        }
        // Special case - multiselecting but deselecting down to 1, stop the multiselect mode
        if (newMultiSelectKeys.length === 1) {
            newSelectedElement = tempoElement_1.TempoElement.fromKey(newMultiSelectKeys[0]);
        }
        const clearMultiSelectState = () => {
            // Not multi-selecting, so clear the multiselect state
            // Want to do this after setting the selected element to prevent flashing
            parentPort.postMessage({
                id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.MULTI_SELECTED_ELEMENT_KEYS,
                elementKeys: [],
                outerHTMLs: [],
            });
            (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.MULTI_SELECTED_ELEMENT_KEYS, null);
        };
        // Selecting the storyboard from within
        if (newSelectedElement.isStoryboard()) {
            if (newSelectedElement.getKey() !== currentSelectedElementKey) {
                parentPort.postMessage({
                    id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.SELECTED_ELEMENT_KEY,
                    elementKey: newSelectedElement.getKey(),
                    outerHTML: (_b = (0, jquery_1.default)(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${newSelectedElement.getKey()}`).get(0)) === null || _b === void 0 ? void 0 : _b.outerHTML,
                });
                (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY, newSelectedElement.getKey());
                (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
            }
            (0, editTextUtils_1.teardownEditableText)(parentPort, storyboardId);
            clearMultiSelectState();
            return null;
        }
        if ((0, editTextUtils_1.currentlyEditing)()) {
            const editingInfo = (0, editTextUtils_1.getEditingInfo)();
            if ((editingInfo === null || editingInfo === void 0 ? void 0 : editingInfo.key) !== currentSelectedElementKey) {
                (0, editTextUtils_1.teardownEditableText)(parentPort, storyboardId);
            }
            clearMultiSelectState();
            return null;
        }
        e.preventDefault();
        e.stopPropagation();
        if ((0, editTextUtils_1.canEditText)(newSelectedElement) &&
            newSelectedElement.getKey() === currentSelectedElementKey) {
            (0, editTextUtils_1.setupEditableText)(newSelectedElement, parentPort, storyboardId);
        }
        if (newSelectedElement.getKey() === currentSelectedElementKey) {
            clearMultiSelectState();
            return selectedNavNode;
        }
        parentPort.postMessage({
            id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.SELECTED_ELEMENT_KEY,
            elementKey: newSelectedElement.getKey(),
            outerHTML: (_c = (0, jquery_1.default)(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${newSelectedElement.getKey()}`).get(0)) === null || _c === void 0 ? void 0 : _c.outerHTML,
        });
        (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY, newSelectedElement.getKey());
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
        clearMultiSelectState();
        return selectedNavNode;
    };
    /**
     * Returns if events were passed through
     */
    const passThroughEventsIfNeeded = (e, parentPort, storyboardId) => {
        var _a, _b;
        const driveModeEnabled = !!(0, sessionStorageUtils_1.getSessionStorageItem)('driveModeEnabled', storyboardId);
        const editingTextInfo = (0, editTextUtils_1.getEditingInfo)();
        if (driveModeEnabled || editingTextInfo) {
            return true;
        }
        (_a = e === null || e === void 0 ? void 0 : e.preventDefault) === null || _a === void 0 ? void 0 : _a.call(e);
        (_b = e === null || e === void 0 ? void 0 : e.stopPropagation) === null || _b === void 0 ? void 0 : _b.call(e);
        return false;
    };
    const onClickElementContextMenu = (e, parentPort, storyboardId) => {
        var _a;
        const passedThrough = passThroughEventsIfNeeded(e, parentPort, storyboardId);
        if (passedThrough) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        // Mouse down is called when a user clicks the context menu, but not mouse up, so clear the mouse down
        (0, sessionStorageUtils_1.setMemoryStorageItem)('mouseDragContext', null);
        const elementKeyToNavNode = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.ELEMENT_KEY_TO_NAV_NODE) || {};
        let requestedNavNode;
        if (e.metaKey || e.ctrlKey) {
            const elementKey = (0, identifierUtils_1.getElementKeyFromNode)(e.target);
            requestedNavNode = elementKeyToNavNode[elementKey];
            // Special case -> this is the top-most node so it should trigger a context menu on the storyboard
            if (!requestedNavNode && e.target.parentNode === document.body) {
                requestedNavNode = constantsAndTypes_1.SELECT_OR_HOVER_STORYBOARD;
            }
        }
        else {
            requestedNavNode = getSelectableNavNode(e);
        }
        const currentSelectedElementKey = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY);
        const currentMultiSelectedKeys = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.MULTI_SELECTED_ELEMENT_KEYS);
        if (!requestedNavNode || typeof requestedNavNode === 'string') {
            if (requestedNavNode === constantsAndTypes_1.SELECT_OR_HOVER_STORYBOARD &&
                !(currentMultiSelectedKeys === null || currentMultiSelectedKeys === void 0 ? void 0 : currentMultiSelectedKeys.length)) {
                const storyboardKey = tempoElement_1.TempoElement.forStoryboard(storyboardId).getKey();
                if (currentSelectedElementKey === storyboardKey) {
                    return;
                }
                parentPort.postMessage({
                    id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.SELECTED_ELEMENT_KEY,
                    elementKey: storyboardKey,
                });
                (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY, storyboardKey);
                (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
            }
            return;
        }
        let contextRequestedElementKey = null;
        const selectedElementKey = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY);
        const selectedElement = tempoElement_1.TempoElement.fromKey(selectedElementKey);
        // Don't select any children as the user might be right clicking a node they selected
        if (!requestedNavNode.tempoElement.isEqual(selectedElement) &&
            !selectedElement.isParentOf(requestedNavNode.tempoElement) &&
            !(currentMultiSelectedKeys === null || currentMultiSelectedKeys === void 0 ? void 0 : currentMultiSelectedKeys.length) // Also don't select anything new if in multiselect mode
        ) {
            contextRequestedElementKey = requestedNavNode.tempoElement.getKey();
            parentPort.postMessage({
                id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.SELECTED_ELEMENT_KEY,
                elementKey: contextRequestedElementKey,
                outerHTML: (_a = (0, jquery_1.default)(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${contextRequestedElementKey}`).get(0)) === null || _a === void 0 ? void 0 : _a.outerHTML,
            });
            (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY, contextRequestedElementKey);
            (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
        }
        const importantFields = {
            clientX: e.clientX,
            clientY: e.clientY,
        };
        parentPort.postMessage({
            id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.CONTEXT_REQUESTED,
            event: importantFields,
        });
    };
    const buildAndSendNavTree = (parentPort, storyboardId, treeElementLookup, scopeLookup, storyboardComponentElement) => {
        let treeElements = treeElementLookup;
        if (!treeElements) {
            treeElements = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.TREE_ELEMENT_LOOKUP) || {};
        }
        let scopes = scopeLookup;
        if (!scopes) {
            scopes = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.SCOPE_LOOKUP) || {};
        }
        let storyboardComponent = storyboardComponentElement;
        if (storyboardComponentElement === 'EXPLICIT_NONE') {
            storyboardComponent = null;
        }
        else if (!storyboardComponent) {
            storyboardComponent = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.STORYBOARD_COMPONENT) || {};
        }
        const rootReactElement = (0, resqUtils_1.getRootReactElement)();
        const reactTree = (0, resqUtils_1.buildNodeTree)(rootReactElement, null);
        const lookupIdToReactTreeMap = {};
        (0, resqUtils_1.buildTreeLookupMap)(reactTree, lookupIdToReactTreeMap);
        const knownComponentNames = new Set();
        const knownComponentInstanceNames = new Set();
        if (treeElements) {
            Object.values(treeElements).forEach((treeElement) => {
                if (treeElement.type === 'component' ||
                    treeElement.type === 'storybook-component') {
                    knownComponentNames.add(treeElement.componentName);
                }
                if (treeElement.type === 'component-instance') {
                    knownComponentInstanceNames.add(treeElement.componentName);
                }
            });
        }
        const elementKeyToLookupList = {};
        const elementKeyToNavNode = {};
        const builtNavTree = (0, navTreeUtils_1.buildNavForNode)(storyboardId, undefined, (0, jquery_1.default)('body').get(0), '', 'root', scopes, treeElements, lookupIdToReactTreeMap, knownComponentNames, knownComponentInstanceNames, elementKeyToLookupList, elementKeyToNavNode);
        (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.ELEMENT_KEY_TO_LOOKUP_LIST, elementKeyToLookupList);
        (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.CURRENT_NAV_TREE, builtNavTree);
        (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.ELEMENT_KEY_TO_NAV_NODE, elementKeyToNavNode);
        (0, resqUtils_1.clearLookupsFromTree)(reactTree);
        parentPort.postMessage({
            id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.NAV_TREE,
            navTree: builtNavTree,
            outerHtml: document.documentElement.outerHTML,
        });
        // Run callbacks
        (0, navTreeUtils_1.runNavTreeBuiltCallbacks)();
    };
    const onFlushStart = () => {
        // Find all instant update styling classes to delete
        const classesToDelete = [];
        (0, jquery_1.default)(`*[class*=${identifierUtils_1.TEMPO_INSTANT_UPDATE_STYLING_PREFIX}]`).each((i, element) => {
            const classes = (element.getAttribute('class') || '').split(' ');
            classes.forEach((className) => {
                if (className.startsWith(identifierUtils_1.TEMPO_INSTANT_UPDATE_STYLING_PREFIX)) {
                    classesToDelete.push(className);
                }
            });
        });
        (0, jquery_1.default)(`*[${identifierUtils_1.TEMPO_DELETE_AFTER_REFRESH}=true]`).attr(identifierUtils_1.TEMPO_QUEUE_DELETE_AFTER_HOT_RELOAD, 'true');
        // Clear the add class instant update queue as those items will be applied in the hot reload
        (0, sessionStorageUtils_1.setMemoryStorageItem)(changeItemFunctions_1.ADD_CLASS_INSTANT_UPDATE_QUEUE, []);
        (0, sessionStorageUtils_1.setMemoryStorageItem)('POST_HOT_RELOAD_CLEAR', {
            classesToDelete,
        });
    };
    const clearInstantUpdatesAndSendNavTree = (parentPort, storyboardId) => {
        globalUIUpdateRunner(() => {
            (0, sessionStorageUtils_1.setMemoryStorageItem)(LAST_NAV_TREE_REFRESH_TIME, new Date());
            const { classesToDelete } = (0, sessionStorageUtils_1.getMemoryStorageItem)('POST_HOT_RELOAD_CLEAR') || {};
            // Delete all instant update changed elements
            (0, jquery_1.default)(`*[${identifierUtils_1.TEMPO_QUEUE_DELETE_AFTER_HOT_RELOAD}=true]`).remove();
            // Clear the added display nones
            (0, jquery_1.default)(`.${identifierUtils_1.TEMPO_DISPLAY_NONE_UNTIL_REFRESH_CLASS}`).removeClass(identifierUtils_1.TEMPO_DISPLAY_NONE_UNTIL_REFRESH_CLASS);
            (0, jquery_1.default)(`*[${identifierUtils_1.TEMPO_INSTANT_UPDATE}=true]`).removeAttr(identifierUtils_1.TEMPO_INSTANT_UPDATE);
            (0, jquery_1.default)(`*[${identifierUtils_1.TEMPO_DO_NOT_SHOW_IN_NAV_UNTIL_REFRESH}=true]`).removeAttr(identifierUtils_1.TEMPO_DO_NOT_SHOW_IN_NAV_UNTIL_REFRESH);
            (0, jquery_1.default)(`.${changeItemFunctions_1.TEMPORARY_STYLING_CLASS_NAME}`).removeClass(changeItemFunctions_1.TEMPORARY_STYLING_CLASS_NAME);
            // Any classes marked to delete before the hot reload
            classesToDelete === null || classesToDelete === void 0 ? void 0 : classesToDelete.forEach((cls) => {
                (0, jquery_1.default)(`.${cls}`).removeClass(cls);
            });
            const newAddClassQueue = (0, sessionStorageUtils_1.getMemoryStorageItem)(changeItemFunctions_1.ADD_CLASS_INSTANT_UPDATE_QUEUE) || [];
            // Any attributes that start with the styling prefix leftover mean that the class needs to be re-applied
            // these are classes that were added in instant updates while the hot reload was in progress
            newAddClassQueue.forEach((item) => {
                if (!item) {
                    return;
                }
                const { codebaseId, className } = item;
                if (codebaseId && className) {
                    (0, jquery_1.default)(`.${codebaseId}`).attr(identifierUtils_1.TEMPO_INSTANT_UPDATE, 'true');
                    (0, jquery_1.default)(`.${codebaseId}`).addClass(className);
                }
            });
        });
        // Rebuild the nav tree on DOM changed after some time has passed
        // this gives the react fiber time to be fully reconciled
        try {
            setTimeout(() => {
                globalUIUpdateRunner(() => {
                    buildAndSendNavTree(parentPort, storyboardId);
                    (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
                });
            }, 300);
        }
        catch (e) {
            console.error('ERROR: Could not re-create nav tree on DOM change, ' + e);
        }
    };
    const onDOMChanged = ({ mutations, parentPort, storyboardId, fromNextJsLoader, }) => {
        var _a;
        // Udpate the href in the parent container
        if ((0, sessionStorageUtils_1.getMemoryStorageItem)('href') !== window.location.href) {
            parentPort.postMessage({
                id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.LATEST_HREF,
                href: window.location.href,
            });
            (0, sessionStorageUtils_1.setMemoryStorageItem)('href', window.location.href);
        }
        // Check if we should refresh the nav tree
        let refreshNavTree = false;
        if (fromNextJsLoader) {
            // From the nextjs loader, refresh when the loader gets hidden (means refresh is done)
            const mutationTarget = (_a = mutations === null || mutations === void 0 ? void 0 : mutations[0]) === null || _a === void 0 ? void 0 : _a.target;
            if (mutationTarget && mutationTarget.id === 'container') {
                const currentlyHotReloading = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.HOT_RELOADING);
                if (mutationTarget.classList.contains('visible')) {
                    (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.HOT_RELOADING, true);
                }
                else {
                    (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.HOT_RELOADING, false);
                    refreshNavTree = true;
                }
            }
        }
        else {
            mutations.forEach((e) => {
                if (refreshNavTree) {
                    return;
                }
                // If the class attribute has changed on an element we have to reparse the nav tree to add the element key
                if (e.type === 'attributes' &&
                    e.attributeName === 'class' &&
                    e.target &&
                    !(0, outlineUtils_1.isNodeOutline)(e.target) &&
                    !(0, identifierUtils_1.isMovingElement)(e.target) &&
                    // And not a script
                    // Bug found on Oct 8, 2024, for some reason the script kept triggering a reload
                    !e.target.tagName.toLowerCase().includes('script')) {
                    const elementKey = (0, identifierUtils_1.getElementKeyFromNode)(e.target);
                    const uniqueLookup = (0, identifierUtils_1.getUniqueLookupFromNode)(e.target);
                    // An element which doesn't have an element key has changed
                    if (!elementKey && !uniqueLookup && !(0, identifierUtils_1.isElementInSvg)(e.target)) {
                        refreshNavTree = true;
                    }
                    return;
                }
                [e.addedNodes, e.removedNodes].forEach((nodeList) => {
                    if (refreshNavTree) {
                        return;
                    }
                    if (!nodeList) {
                        return;
                    }
                    nodeList.forEach((node) => {
                        if (!(0, outlineUtils_1.isNodeOutline)(node) && !(0, identifierUtils_1.isMovingElement)(node)) {
                            refreshNavTree = true;
                            return;
                        }
                    });
                });
            });
        }
        if (!refreshNavTree) {
            return;
        }
        // In these cases we don't want to trigger a nav tree refresh right away
        // since the hot reload may not have happened yet. So we set a timeout and only
        // trigger a nav tree refresh if another one hasn't happened in between
        if (fromNextJsLoader) {
            const triggerTime = new Date();
            setTimeout(() => {
                const lastRefreshTime = (0, sessionStorageUtils_1.getMemoryStorageItem)(LAST_NAV_TREE_REFRESH_TIME);
                // Don't re-clear and send if another refresh has happened in the meantime
                if (!lastRefreshTime || lastRefreshTime < triggerTime) {
                    clearInstantUpdatesAndSendNavTree(parentPort, storyboardId);
                }
            }, 1000);
            return;
        }
        clearInstantUpdatesAndSendNavTree(parentPort, storyboardId);
    };
    const onWheel = (e, parentPort, storyboardId) => {
        const passedThrough = passThroughEventsIfNeeded(e, parentPort, storyboardId);
        const isScrollShortcut = e.altKey;
        const isZoomShortcut = e.ctrlKey || e.metaKey;
        // If the user wants to scroll (either by being in drive mode, or by holding alt)
        // and they aren't trying to zoom, fallback to default behaviour.
        if (!isZoomShortcut && (passedThrough || isScrollShortcut)) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        const importantFields = {
            deltaX: e.deltaX,
            deltaY: e.deltaY,
            wheelDelta: e.wheelDelta,
            x: e.x,
            y: e.y,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
        };
        parentPort.postMessage({
            id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.WHEEL_EVENT,
            event: importantFields,
        });
    };
    const activeElementMetadata = () => {
        const activeElement = document.activeElement;
        let tagName, isContentEditable, elementType;
        if (activeElement) {
            tagName = activeElement.tagName;
            if (activeElement instanceof HTMLElement) {
                isContentEditable = activeElement.isContentEditable;
            }
            if (activeElement instanceof HTMLInputElement) {
                elementType = activeElement.type;
            }
        }
        return {
            tagName: tagName,
            isContentEditable: isContentEditable,
            elementType: elementType,
        };
    };
    const onKeyDown = (e, parentPort) => {
        parentPort.postMessage({
            id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.KEY_DOWN_EVENT,
            event: {
                key: e.key,
                metaKey: e.metaKey,
                shiftKey: e.shiftKey,
                ctrlKey: e.ctrlKey,
                activeElement: Object.assign({}, activeElementMetadata()),
            },
        });
    };
    const onKeyUp = (e, parentPort) => {
        parentPort.postMessage({
            id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.KEY_UP_EVENT,
            event: {
                key: e.key,
                metaKey: e.metaKey,
                shiftKey: e.shiftKey,
                ctrlKey: e.ctrlKey,
                activeElement: Object.assign({}, activeElementMetadata()),
            },
        });
    };
    const throttledUpdateOutlines = lodash_1.default.throttle((parentPort, storyboardId) => (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId), 15);
    const onScroll = (e, parentPort, storyboardId) => {
        throttledUpdateOutlines(parentPort, storyboardId);
    };
    // Need to register functions on the window for channel messaging to use them
    // @ts-ignore
    window.initProject = (parentPort, storyboardId, treeElementLookup, scopeLookup, storyboardComponentElement, options = {}, storyboardType, savedComponentFilename, originalStoryboardUrl) => {
        const passive = makePassiveEventOption();
        passive['capture'] = true;
        const body$ = (0, jquery_1.default)('body');
        (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.TREE_ELEMENT_LOOKUP, treeElementLookup);
        (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.SCOPE_LOOKUP, scopeLookup);
        if (storyboardComponentElement) {
            (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.STORYBOARD_COMPONENT, storyboardComponentElement);
        }
        (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.STORYBOARD_TYPE, storyboardType);
        (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.SAVED_STORYBOARD_COMPONENT_FILENAME, savedComponentFilename);
        // The URL that was originally loaded for this storyboard, it may be different from href
        // if the user navigated away to a new route
        if (originalStoryboardUrl) {
            (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.ORIGINAL_STORYBOARD_URL, originalStoryboardUrl);
        }
        // Clear iframe outlines
        (0, sessionStorageUtils_1.removeMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY);
        (0, sessionStorageUtils_1.removeMemoryStorageItem)(sessionStorageUtils_1.HOVERED_ELEMENT_KEY);
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
        // Register event listeners
        const bodyObject = body$.get(0);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('click', (e) => {
            passThroughEventsIfNeeded(e, parentPort, storyboardId);
        }, passive);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('pointerover', (e) => {
            onPointerOver(e, parentPort, storyboardId);
        }, passive);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('pointerdown', (e) => {
            onPointerDown(e, parentPort, storyboardId);
        }, passive);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('pointerup', (e) => {
            onPointerUp(e, parentPort, storyboardId);
        }, passive);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('pointermove', (e) => {
            onPointerMove(e, parentPort, storyboardId);
        }, passive);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('pointerleave', (e) => {
            passThroughEventsIfNeeded(e, parentPort, storyboardId);
        }, passive);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('contextmenu', (e) => {
            onClickElementContextMenu(e, parentPort, storyboardId);
        }, passive);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('dblclick', (e) => {
            passThroughEventsIfNeeded(e, parentPort, storyboardId);
        }, passive);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('mouseover', (e) => {
            passThroughEventsIfNeeded(e, parentPort, storyboardId);
        }, passive);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('mouseout', (e) => {
            passThroughEventsIfNeeded(e, parentPort, storyboardId);
        }, passive);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('mousemove', (e) => {
            passThroughEventsIfNeeded(e, parentPort, storyboardId);
        }, passive);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('mousedown', (e) => {
            passThroughEventsIfNeeded(e, parentPort, storyboardId);
        }, passive);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('mouseup', (e) => {
            passThroughEventsIfNeeded(e, parentPort, storyboardId);
        }, passive);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('wheel', (e) => {
            onWheel(e, parentPort, storyboardId);
        }, passive);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('keydown', (e) => {
            onKeyDown(e, parentPort);
        }, passive);
        bodyObject === null || bodyObject === void 0 ? void 0 : bodyObject.addEventListener('keyup', (e) => {
            onKeyUp(e, parentPort);
        }, passive);
        window.addEventListener('scroll', (e) => {
            onScroll(e, parentPort, storyboardId);
        }, passive);
        // Hack: this is used to
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement &&
                (0, sessionStorageUtils_1.getMemoryStorageItem)(IMMEDIATELY_REMOVE_POINTER_LOCK)) {
                document.exitPointerLock();
                (0, sessionStorageUtils_1.setMemoryStorageItem)(IMMEDIATELY_REMOVE_POINTER_LOCK, false);
            }
        }, false);
        const debounceExecutor = new DebounceExecutor_1.DebounceExecutor();
        const objsToObserve = [bodyObject];
        const nextBuildWatcher = document.getElementById('__next-build-watcher');
        if (nextBuildWatcher && nextBuildWatcher.shadowRoot) {
            // If this is NextJS, also listen to the shadow root of the __next-build-watcher
            // This triggeres the onDOMChanged when the hot reload symbol shows up
            objsToObserve.push(...Array.from(nextBuildWatcher.shadowRoot.children));
        }
        globalUIUpdateRunner = observeDOM(objsToObserve, (e) => {
            debounceExecutor.schedule(() => {
                onDOMChanged({
                    mutations: e,
                    parentPort,
                    storyboardId,
                });
            });
        });
        if (options.driveModeEnabled) {
            enableDriveMode(parentPort, storyboardId);
        }
        else {
            disableDriveMode(parentPort, storyboardId);
        }
        if (options.aiContextSelection) {
            (0, sessionStorageUtils_1.setMemoryStorageItem)('aiContext', true);
            (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
        }
        else {
            (0, sessionStorageUtils_1.setMemoryStorageItem)('aiContext', false);
            (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
        }
        // Build the Nav Tree and send it back
        try {
            globalUIUpdateRunner(() => {
                buildAndSendNavTree(parentPort, storyboardId, treeElementLookup, scopeLookup, storyboardComponentElement || 'EXPLICIT_NONE');
            });
        }
        catch (e) {
            console.log(e);
            console.error('Error building nav tree: ' + e);
        }
    };
    const enableDriveMode = (parentPort, storyboardId) => {
        // @ts-ignore
        if (!(0, sessionStorageUtils_1.getSessionStorageItem)('driveModeEnabled', storyboardId)) {
            // @ts-ignore
            (0, sessionStorageUtils_1.setSessionStorageItem)('driveModeEnabled', 'enabled', storyboardId);
            clearHoveredElements(parentPort, storyboardId);
            (0, outlineUtils_1.clearAllOutlines)();
        }
        (0, jquery_1.default)('body').css('cursor', '');
    };
    const disableDriveMode = (parentPort, storyboardId) => {
        // @ts-ignore
        if ((0, sessionStorageUtils_1.getSessionStorageItem)('driveModeEnabled', storyboardId)) {
            // @ts-ignore
            (0, sessionStorageUtils_1.removeSessionStorageItem)('driveModeEnabled', storyboardId);
            (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
            clearHoveredElements(parentPort, storyboardId);
        }
        (0, jquery_1.default)('body').attr('style', function (i, s) {
            return (s || '') + 'cursor: default !important;';
        });
    };
    // @ts-ignore
    window.enableDriveMode = (parentPort, storyboardId) => {
        enableDriveMode(parentPort, storyboardId);
    };
    // @ts-ignore
    window.disableDriveMode = (parentPort, storyboardId) => {
        disableDriveMode(parentPort, storyboardId);
    };
    // @ts-ignore
    window.setNewLookups = (parentPort, storyboardId, treeElementLookup, scopeLookup) => {
        const prevTreeElemntLookup = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.TREE_ELEMENT_LOOKUP) || {};
        const prevScopeLookup = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.SCOPE_LOOKUP) || {};
        const newTreeElements = Object.assign({}, prevTreeElemntLookup);
        // Delete any tree elements that were set to nul
        Object.keys(treeElementLookup).forEach((key) => {
            if (treeElementLookup[key]) {
                newTreeElements[key] = treeElementLookup[key];
            }
            else if (newTreeElements[key]) {
                delete newTreeElements[key];
            }
        });
        const newScopes = Object.assign({}, prevScopeLookup);
        // Delete any scopes that were set to nul
        Object.keys(scopeLookup).forEach((key) => {
            if (scopeLookup[key]) {
                newScopes[key] = scopeLookup[key];
            }
            else if (newScopes[key]) {
                delete newScopes[key];
            }
        });
        (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.TREE_ELEMENT_LOOKUP, newTreeElements);
        (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.SCOPE_LOOKUP, newScopes);
    };
    // @ts-ignore
    window.setHoveredElement = (parentPort, storyboardId, elementKey) => {
        const driveModeEnabled = !!(0, sessionStorageUtils_1.getSessionStorageItem)('driveModeEnabled', storyboardId);
        if (driveModeEnabled) {
            return;
        }
        const prevHoveredElementKey = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.HOVERED_ELEMENT_KEY);
        if (prevHoveredElementKey === elementKey) {
            return;
        }
        if (elementKey) {
            (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.HOVERED_ELEMENT_KEY, elementKey);
        }
        else {
            (0, sessionStorageUtils_1.removeMemoryStorageItem)(sessionStorageUtils_1.HOVERED_ELEMENT_KEY);
        }
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
    };
    // @ts-ignore
    window.setSelectedElement = (parentPort, storyboardId, elementKey) => {
        var _a, _b;
        const prevSelectedElementKey = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY);
        if (prevSelectedElementKey === elementKey) {
            return;
        }
        if (elementKey) {
            const tempoElement = tempoElement_1.TempoElement.fromKey(elementKey);
            let elementKeyToExtract = elementKey;
            if (tempoElement.isStoryboard(storyboardId)) {
                // Pass back the outerHTML of the top level node
                const topLevelNode = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.CURRENT_NAV_TREE);
                const topLevelElementKey = (_a = topLevelNode === null || topLevelNode === void 0 ? void 0 : topLevelNode.tempoElement) === null || _a === void 0 ? void 0 : _a.getKey();
                if (topLevelElementKey) {
                    elementKeyToExtract = topLevelElementKey;
                }
            }
            // Send back the message just to set the outerHTML only
            parentPort.postMessage({
                id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.SELECTED_ELEMENT_KEY,
                doNotSetElementKey: true,
                outerHTML: (_b = (0, jquery_1.default)(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${elementKeyToExtract}`).get(0)) === null || _b === void 0 ? void 0 : _b.outerHTML,
            });
            (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY, elementKey);
        }
        else {
            parentPort.postMessage({
                id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.SELECTED_ELEMENT_KEY,
                doNotSetElementKey: true,
                outerHTML: null,
            });
            (0, sessionStorageUtils_1.removeMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY);
        }
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
    };
    // @ts-ignore
    window.setMultiselectedElementKeys = (parentPort, storyboardId, elementKeys) => {
        const prevMultiSelectedElementKeys = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.MULTI_SELECTED_ELEMENT_KEYS);
        const prevSet = new Set(prevMultiSelectedElementKeys || []);
        const newSet = new Set(elementKeys || []);
        const setsEqual = prevSet.size === newSet.size &&
            [...prevSet].every((value) => newSet.has(value));
        if (setsEqual) {
            return;
        }
        if (elementKeys) {
            (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.MULTI_SELECTED_ELEMENT_KEYS, elementKeys);
            parentPort.postMessage({
                id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.MULTI_SELECTED_ELEMENT_KEYS,
                doNotSetElementKeys: true,
                outerHTMLs: elementKeys === null || elementKeys === void 0 ? void 0 : elementKeys.map((elementKey) => { var _a; return (_a = (0, jquery_1.default)(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${elementKey}`).get(0)) === null || _a === void 0 ? void 0 : _a.outerHTML; }),
            });
        }
        else {
            (0, sessionStorageUtils_1.removeMemoryStorageItem)(sessionStorageUtils_1.MULTI_SELECTED_ELEMENT_KEYS);
            parentPort.postMessage({
                id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.MULTI_SELECTED_ELEMENT_KEYS,
                doNotSetElementKeys: true,
                outerHTMLs: [],
            });
        }
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
    };
    // @ts-ignore
    window.processRulesForSelectedElement = (parentPort, storyboardId, cssElementLookup, selectedElementKey) => {
        (0, cssFunctions_1.processRulesForSelectedElement)(parentPort, cssElementLookup, selectedElementKey);
    };
    // @ts-ignore
    window.setModifiersForSelectedElement = (parentPort, storyboardId, modifiers, selectedElementKey) => {
        (0, cssFunctions_1.setModifiersForSelectedElement)(parentPort, modifiers, selectedElementKey);
    };
    // @ts-ignore
    window.getCssEvals = (parentPort, storyboardId, selectedElementKey) => {
        (0, cssFunctions_1.getCssEvals)(parentPort, selectedElementKey);
    };
    // @ts-ignore
    window.ruleMatchesElement = (parentPort, storyboardId, messageId, rule, selectedElementKey) => {
        (0, cssFunctions_1.ruleMatchesElement)(parentPort, messageId, rule, selectedElementKey);
    };
    // @ts-ignore
    window.getElementClassList = (parentPort, storyboardId, selectedElementKey) => {
        (0, cssFunctions_1.getElementClassList)(parentPort, selectedElementKey);
    };
    // @ts-ignore
    window.applyChangeItemToDocument = (parentPort, storyboardId, changeItem) => __awaiter(void 0, void 0, void 0, function* () {
        const { sendNewNavTree } = (0, changeItemFunctions_1.applyChangeItemToDocument)(parentPort, storyboardId, changeItem);
        // Update the nav tree & outlines
        if (sendNewNavTree) {
            buildAndSendNavTree(parentPort, storyboardId);
        }
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
    });
    // @ts-ignore
    window.updateCodebaseIds = (parentPort, storyboardId, prevIdToNewIdMap, newTreeElementLookup, newScopeLookup) => {
        const sendNewNavTree = (0, changeItemFunctions_1.updateCodebaseIds)(parentPort, prevIdToNewIdMap, true);
        if (sendNewNavTree) {
            buildAndSendNavTree(parentPort, storyboardId, newTreeElementLookup, newScopeLookup);
        }
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
    };
    // @ts-ignore
    window.dispatchEvent = (parentPort, storyboardId, eventName, eventDetails) => {
        const event = new CustomEvent(eventName, Object.assign({}, eventDetails));
        document.dispatchEvent(event);
    };
    // @ts-ignore
    window.updateOutlines = (parentPort, storyboardId) => {
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
    };
    // @ts-ignore
    window.goBack = (parentPort, storyboardId) => {
        if (document.referrer !== '') {
            window.history.back();
        }
    };
    // @ts-ignore
    window.goForward = (parentPort, storyboardId) => {
        window.history.forward();
    };
    // @ts-ignore
    window.refresh = (parentPort, storyboardId) => {
        window.location.reload();
    };
    // @ts-ignore
    window.syntheticMouseOver = (parentPort, storyboardId, coords, dontHoverInsideSelected, selectBottomMostElement) => {
        const target = document.elementFromPoint(coords.x, coords.y);
        // If this is true we don't want to trigger a hover event inside a selected element, instead just set hovering on the selected element
        if (dontHoverInsideSelected) {
            const selectedElementKey = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY);
            const selectedElement = tempoElement_1.TempoElement.fromKey(selectedElementKey);
            if (!selectedElement.isEmpty()) {
                const selectedDomElement = document.querySelector(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${selectedElementKey}`);
                if (selectedDomElement === null || selectedDomElement === void 0 ? void 0 : selectedDomElement.contains(target)) {
                    onPointerOver({ target: selectedDomElement }, parentPort, storyboardId);
                    return;
                }
            }
        }
        onPointerOver({ target }, parentPort, storyboardId, selectBottomMostElement);
    };
    // @ts-ignore
    window.syntheticMouseMove = (parentPort, storyboardId, syntheticEvent) => {
        const eventWithClient = Object.assign(Object.assign({}, syntheticEvent), { pageX: syntheticEvent.clientX +
                (document.documentElement.scrollLeft || document.body.scrollLeft), pageY: syntheticEvent.clientY +
                (document.documentElement.scrollTop || document.body.scrollTop) });
        onPointerMove(eventWithClient, parentPort, storyboardId);
    };
    // @ts-ignore
    window.syntheticMouseUp = (parentPort, storyboardId, syntheticEvent) => {
        onPointerUp(syntheticEvent, parentPort, storyboardId);
    };
    // @ts-ignore
    window.clearHoveredOutlines = (parentPort, storyboardId) => {
        if ((0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.HOVERED_ELEMENT_KEY)) {
            clearHoveredElements(parentPort, storyboardId);
        }
    };
    // @ts-ignore
    window.setZoomPerc = (parentPort, storyboardId, zoomPerc) => {
        (0, sessionStorageUtils_1.setMemoryStorageItem)('zoomPerc', zoomPerc.toString());
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
    };
    // @ts-ignore
    window.setAiContext = (parentPort, storyboardId, aiContext) => {
        (0, sessionStorageUtils_1.setMemoryStorageItem)('aiContext', !!aiContext);
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
    };
    // @ts-ignore
    window.tempMoveElement = (parentPort, storyboardId, nodeToMoveElementKey, newIndex) => {
        var _a, _b, _c, _d, _e;
        const elementKeyToNavNode = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.ELEMENT_KEY_TO_NAV_NODE) || {};
        const navNodeToMove = elementKeyToNavNode[nodeToMoveElementKey];
        if (!navNodeToMove) {
            return;
        }
        const nodeToMoveElement = tempoElement_1.TempoElement.fromKey(nodeToMoveElementKey);
        const domElementsToMove = [];
        // In components, there may be multiple elements that need to be moved, the eleemntKeyToLookupList
        // are all the real DOM elements in a component
        // For non-components, the eleemntKeyToLookupList points to a list of itself
        const elementKeyToLookupList = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.ELEMENT_KEY_TO_LOOKUP_LIST) || {};
        const lookupList = elementKeyToLookupList[navNodeToMove.tempoElement.getKey()] || [];
        lookupList.forEach((lookupElementKey) => {
            domElementsToMove.push((0, jquery_1.default)('body').find(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${lookupElementKey}`).get(0));
        });
        const parentDomElement = (_a = domElementsToMove[0]) === null || _a === void 0 ? void 0 : _a.parentElement;
        const parentNavNode = navNodeToMove.parent;
        if (parentDomElement && parentNavNode) {
            const currentIndex = (_b = parentNavNode === null || parentNavNode === void 0 ? void 0 : parentNavNode.children) === null || _b === void 0 ? void 0 : _b.indexOf(navNodeToMove);
            const numChildren = (_c = parentNavNode === null || parentNavNode === void 0 ? void 0 : parentNavNode.children) === null || _c === void 0 ? void 0 : _c.length;
            if (currentIndex !== newIndex) {
                Array.from(parentDomElement.children).forEach((child) => {
                    (0, jquery_1.default)(child).attr(identifierUtils_1.TEMPO_INSTANT_UPDATE, 'true');
                });
                (0, jquery_1.default)(parentDomElement).attr(identifierUtils_1.TEMPO_INSTANT_UPDATE, 'true');
                if (newIndex === numChildren - 1) {
                    domElementsToMove.forEach((element) => {
                        element.parentElement.appendChild(element);
                    });
                }
                else {
                    // If the current index is before the new index then we need to adjust by 1 to account for the shift in indices
                    const beforeNode = currentIndex > newIndex
                        ? parentNavNode === null || parentNavNode === void 0 ? void 0 : parentNavNode.children[newIndex]
                        : parentNavNode === null || parentNavNode === void 0 ? void 0 : parentNavNode.children[newIndex + 1];
                    const lookupListForBefore = elementKeyToLookupList[(_d = beforeNode === null || beforeNode === void 0 ? void 0 : beforeNode.tempoElement) === null || _d === void 0 ? void 0 : _d.getKey()] || [];
                    if (!lookupListForBefore.length) {
                        console.log('Cannot find element to insert before in lookup list');
                        return;
                    }
                    const beforeDomElement = (0, jquery_1.default)('body')
                        .find(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${lookupListForBefore[0]}`)
                        .get(0);
                    if (!beforeDomElement) {
                        console.log('Cannot find element to insert before');
                        return;
                    }
                    domElementsToMove.forEach((element) => {
                        element.parentElement.insertBefore(element, beforeDomElement);
                    });
                }
                // Update the selected element key to the new expected one (note if moving there is no hovered element key)
                // This also assumes the nodeToMoveElementKey is the selected element key
                const elementToMoveSegments = nodeToMoveElement.uniquePath.split('-');
                const newSelectedUniquePath = elementToMoveSegments
                    .slice(0, elementToMoveSegments.length - 1)
                    .join('-') + `-${newIndex}`;
                const newSelectedElementKey = new tempoElement_1.TempoElement(nodeToMoveElement.codebaseId, nodeToMoveElement.storyboardId, newSelectedUniquePath).getKey();
                // Update the nav tree which also sets the element key on all the elements, need to do this before
                // updating the selected element key
                buildAndSendNavTree(parentPort, storyboardId);
                // Codebase ID doesn't change
                parentPort.postMessage({
                    id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.SELECTED_ELEMENT_KEY,
                    elementKey: newSelectedElementKey,
                    outerHTML: (_e = (0, jquery_1.default)(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${newSelectedElementKey}`).get(0)) === null || _e === void 0 ? void 0 : _e.outerHTML,
                });
                (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY, newSelectedElementKey);
                (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
            }
        }
    };
    // @ts-ignore
    window.tempAddDiv = (parentPort, storyboardId, parentCodebaseId, indexInParent, width, height) => {
        const element = (0, jquery_1.default)(`.${identifierUtils_1.TEMPO_INSTANT_DIV_DRAW_CLASS}`);
        if (element.length) {
            element.css('width', width);
            element.css('height', height);
        }
        else {
            let parent = (0, jquery_1.default)(`.${parentCodebaseId}`);
            if (!parent.length) {
                parent = (0, jquery_1.default)('body');
            }
            parent.each((index, item) => {
                const newElement = (0, jquery_1.default)(`<div class="${identifierUtils_1.TEMPO_INSTANT_DIV_DRAW_CLASS}" ${identifierUtils_1.TEMPO_DELETE_AFTER_INSTANT_UPDATE}="true" ${identifierUtils_1.TEMPO_DELETE_AFTER_REFRESH}="true" ${identifierUtils_1.TEMPO_INSTANT_UPDATE}="true"></div>`);
                const childAtIndex = (0, jquery_1.default)(item).children().eq(indexInParent);
                if (childAtIndex === null || childAtIndex === void 0 ? void 0 : childAtIndex.length) {
                    childAtIndex.before(newElement);
                }
                else {
                    (0, jquery_1.default)(item).append(newElement);
                }
            });
            // Update the nav tree
            buildAndSendNavTree(parentPort, storyboardId);
        }
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
    };
    // @ts-ignore
    window.tempMoveToNewParent = (parentPort, storyboardId, indicatorWidth, indicatorHeight, newPositionX, newPositionY, parentElementKey, clear) => {
        (0, jquery_1.default)(`.${identifierUtils_1.TEMPO_MOVE_BETWEEN_PARENTS_OUTLINE}`).remove();
        if (clear) {
            return;
        }
        const newElement = document.createElement('div');
        newElement.classList.add(identifierUtils_1.TEMPO_MOVE_BETWEEN_PARENTS_OUTLINE);
        newElement.setAttribute(identifierUtils_1.TEMPO_INSTANT_UPDATE, 'true'); // Add so it doesn't trigger new nav tree building
        newElement.style.width = indicatorWidth + 'px';
        newElement.style.height = indicatorHeight + 'px';
        newElement.style.left = newPositionX + 'px';
        newElement.style.top = newPositionY + 'px';
        newElement.style.position = 'fixed';
        newElement.style.pointerEvents = 'none';
        newElement.style.zIndex = '2000000004';
        newElement.style.boxSizing = 'border-box';
        newElement.style.cursor = 'default !important';
        newElement.style.backgroundColor = outlineUtils_1.PRIMARY_OUTLINE_COLOUR;
        const body = document.getElementsByTagName('body')[0];
        body.appendChild(newElement);
        const parentDomElement = (0, jquery_1.default)(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${parentElementKey}`).get(0);
        if (parentDomElement) {
            const boundingRect = parentDomElement.getBoundingClientRect();
            const parentOutline = (0, outlineUtils_1.getOutlineElement)(parentPort, outlineUtils_1.OutlineType.PRIMARY, boundingRect.left, boundingRect.top, boundingRect.width, boundingRect.height);
            parentOutline.classList.remove(identifierUtils_1.OUTLINE_CLASS);
            parentOutline.classList.add(identifierUtils_1.TEMPO_MOVE_BETWEEN_PARENTS_OUTLINE);
            parentOutline.setAttribute(identifierUtils_1.TEMPO_INSTANT_UPDATE, 'true'); // Add so it doesn't trigger new nav tree building
            body.appendChild(parentOutline);
        }
    };
    // @ts-ignore
    window.checkIfHydrationError = (parentPort, storyboardId) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        let errorDescr, errorLabel, errorBody, hasError;
        if (window.location.href.includes('framework=VITE')) {
            // @ts-ignore
            const errorPortal = (_a = document.getElementsByTagName('vite-error-overlay')[0]) === null || _a === void 0 ? void 0 : _a.shadowRoot;
            errorDescr = 'A Vite Error Occurred';
            errorLabel =
                (_d = (_c = (_b = errorPortal === null || errorPortal === void 0 ? void 0 : errorPortal.querySelectorAll) === null || _b === void 0 ? void 0 : _b.call(errorPortal, '.file-link')) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.innerHTML;
            errorBody = (_g = (_f = (_e = errorPortal === null || errorPortal === void 0 ? void 0 : errorPortal.querySelectorAll) === null || _e === void 0 ? void 0 : _e.call(errorPortal, '.message')) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.innerHTML;
            hasError = Boolean(errorLabel || errorBody);
        }
        else {
            // @ts-ignore
            const errorPortal = (_h = document.getElementsByTagName('nextjs-portal')[0]) === null || _h === void 0 ? void 0 : _h.shadowRoot;
            errorDescr = (_k = (_j = errorPortal === null || errorPortal === void 0 ? void 0 : errorPortal.getElementById) === null || _j === void 0 ? void 0 : _j.call(errorPortal, 'nextjs__container_errors_desc')) === null || _k === void 0 ? void 0 : _k.innerHTML;
            errorLabel = (_m = (_l = errorPortal === null || errorPortal === void 0 ? void 0 : errorPortal.getElementById) === null || _l === void 0 ? void 0 : _l.call(errorPortal, 'nextjs__container_errors_label')) === null || _m === void 0 ? void 0 : _m.innerHTML;
            errorBody = (_q = (_p = (_o = errorPortal === null || errorPortal === void 0 ? void 0 : errorPortal.querySelectorAll) === null || _o === void 0 ? void 0 : _o.call(errorPortal, '.nextjs-container-errors-body')) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q.innerHTML;
            hasError = Boolean(errorDescr);
        }
        // Check if the contents of the hydration container contain the text "Hydration failed"
        if (hasError) {
            if (errorDescr === null || errorDescr === void 0 ? void 0 : errorDescr.includes('Hydration failed')) {
                parentPort.postMessage({
                    id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.LATEST_HYDRATION_ERROR_STATUS,
                    status: constantsAndTypes_1.STORYBOARD_HYDRATION_STATUS.ERROR,
                    errorDescr,
                    errorLabel,
                    errorBody,
                });
            }
            else {
                parentPort.postMessage({
                    id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.LATEST_HYDRATION_ERROR_STATUS,
                    status: constantsAndTypes_1.STORYBOARD_HYDRATION_STATUS.OTHER_ERROR,
                    errorDescr,
                    errorLabel,
                    errorBody,
                });
            }
        }
        else {
            parentPort.postMessage({
                id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.LATEST_HYDRATION_ERROR_STATUS,
                status: constantsAndTypes_1.STORYBOARD_HYDRATION_STATUS.NO_ERROR,
            });
        }
    };
    // @ts-ignore
    window.triggerDragStart = (parentPort, storyboardId) => {
        const selectedElementKey = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.SELECTED_ELEMENT_KEY);
        const elementKeyToNavNode = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.ELEMENT_KEY_TO_NAV_NODE) || {};
        // Something has to be selected to trigger a drag start
        if (!selectedElementKey) {
            return;
        }
        const draggedNavNode = elementKeyToNavNode[selectedElementKey];
        const parentDomElement = getParentDomElementForNavNode(draggedNavNode);
        const selectedElement = (0, jquery_1.default)(`.${identifierUtils_1.ELEMENT_KEY_PREFIX}${selectedElementKey}`).get(0);
        const mouseDragContext = {
            // Start off screen, this will get updated by onMouseMove
            pageX: -10000,
            pageY: -10000,
            // The difference between where the user clicked and the center of the element
            offsetX: 0,
            offsetY: 0,
            dragging: true,
            selectedParentDisplay: (0, cssFunctions_1.cssEval)(parentDomElement, 'display'),
            selectedParentFlexDirection: (0, cssFunctions_1.cssEval)(parentDomElement, 'flex-direction'),
        };
        (0, sessionStorageUtils_1.setMemoryStorageItem)('mouseDragContext', mouseDragContext);
        // Trigger the drag start event
        parentPort.postMessage({
            id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.DRAG_START_EVENT,
            event: mouseDragContext,
            outerHTML: selectedElement === null || selectedElement === void 0 ? void 0 : selectedElement.outerHTML,
        });
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
    };
    // @ts-ignore
    window.triggerDragCancel = (parentPort, storyboardId) => {
        (0, sessionStorageUtils_1.setMemoryStorageItem)('mouseDragContext', null);
        parentPort.postMessage({
            id: constantsAndTypes_1.FIXED_IFRAME_MESSAGE_IDS.DRAG_CANCEL_EVENT,
            event: {},
        });
        (0, outlineUtils_1.updateOutlines)(parentPort, storyboardId);
    };
    // @ts-ignore
    window.setIsFlushing = (parentPort, storyboardId, isFlushing) => {
        const wasFlushing = (0, sessionStorageUtils_1.getMemoryStorageItem)(sessionStorageUtils_1.IS_FLUSHING);
        (0, sessionStorageUtils_1.setMemoryStorageItem)(sessionStorageUtils_1.IS_FLUSHING, isFlushing);
        if (isFlushing && !wasFlushing) {
            onFlushStart();
        }
    };
};
exports.initChannelMessagingFunctions = initChannelMessagingFunctions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbm5lbE1lc3NhZ2luZ0Z1bmN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jaGFubmVsTWVzc2FnaW5nL2NoYW5uZWxNZXNzYWdpbmdGdW5jdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdURBa0IyQjtBQUMzQiwrREFxQitCO0FBQy9CLGlEQUt3QjtBQUV4QixhQUFhO0FBQ2Isb0RBQXVCO0FBQ3ZCLG9EQUF1QjtBQUN2QixpREFPd0I7QUFDeEIsaURBT3dCO0FBQ3hCLDJEQUk2QjtBQUM3QiwrREFLK0I7QUFDL0IsMkNBS3FCO0FBQ3JCLGlEQUE4QztBQUs5QyxtREFNeUI7QUFDekIsZ0VBQTZEO0FBQzdELHlDQUFtRTtBQUNuRSxNQUFNLDBCQUEwQixHQUFHLEVBQUUsQ0FBQztBQUV0QyxNQUFNLCtCQUErQixHQUFHLGlDQUFpQyxDQUFDO0FBRTFFLE1BQU0sMEJBQTBCLEdBQUcsNEJBQTRCLENBQUM7QUFFaEUseURBQXlEO0FBRWxELE1BQU0sNkJBQTZCLEdBQUcsR0FBRyxFQUFFO0lBQ2hELDhHQUE4RztJQUM5RyxJQUFJLG9CQUFvQixHQUFHLGdDQUFxQixDQUFDO0lBRWpELGFBQWE7SUFDYixNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRztRQUMxQixJQUFJLElBQUksR0FBRyxDQUFDLEVBQ1YsQ0FBQyxFQUNELEdBQUcsQ0FBQztRQUNOLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDbkMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2hDLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLElBQUksR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcs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e1xuICBnZXRVbmlxdWVMb29rdXBGcm9tTm9kZSxcbiAgaXNNb3ZpbmdFbGVtZW50LFxuICBURU1QT19ERUxFVEVfQUZURVJfUkVGUkVTSCxcbiAgVEVNUE9fSU5TVEFOVF9VUERBVEUsXG4gIFRFTVBPX0lOU1RBTlRfRElWX0RSQVdfQ0xBU1MsXG4gIFRFTVBPX01PVkVfQkVUV0VFTl9QQVJFTlRTX09VVExJTkUsXG4gIE9VVExJTkVfQ0xBU1MsXG4gIFRFTVBPX0RJU1BMQVlfTk9ORV9VTlRJTF9SRUZSRVNIX0NMQVNTLFxuICBnZXRFbGVtZW50S2V5RnJvbU5vZGUsXG4gIEVMRU1FTlRfS0VZX1BSRUZJWCxcbiAgVEVNUE9fRE9fTk9UX1NIT1dfSU5fTkFWX1VOVElMX1JFRlJFU0gsXG4gIFRFTVBPX0lOU1RBTlRfVVBEQVRFX1NUWUxJTkdfUFJFRklYLFxuICBFRElUX1RFWFRfQlVUVE9OLFxuICBoYXNDbGFzcyxcbiAgVEVNUE9fUVVFVUVfREVMRVRFX0FGVEVSX0hPVF9SRUxPQUQsXG4gIFRFTVBPX0RFTEVURV9BRlRFUl9JTlNUQU5UX1VQREFURSxcbiAgaXNFbGVtZW50SW5TdmcsXG59IGZyb20gJy4vaWRlbnRpZmllclV0aWxzJztcbmltcG9ydCB7XG4gIENVUlJFTlRfTkFWX1RSRUUsXG4gIEhPVkVSRURfRUxFTUVOVF9LRVksXG4gIFNBVkVEX1NUT1JZQk9BUkRfQ09NUE9ORU5UX0ZJTEVOQU1FLFxuICBTQ09QRV9MT09LVVAsXG4gIFNFTEVDVEVEX0VMRU1FTlRfS0VZLFxuICBTVE9SWUJPQVJEX0NPTVBPTkVOVCxcbiAgU1RPUllCT0FSRF9UWVBFLFxuICBUUkVFX0VMRU1FTlRfTE9PS1VQLFxuICBFTEVNRU5UX0tFWV9UT19MT09LVVBfTElTVCxcbiAgRUxFTUVOVF9LRVlfVE9fTkFWX05PREUsXG4gIGdldE1lbW9yeVN0b3JhZ2VJdGVtLFxuICBnZXRTZXNzaW9uU3RvcmFnZUl0ZW0sXG4gIHJlbW92ZU1lbW9yeVN0b3JhZ2VJdGVtLFxuICByZW1vdmVTZXNzaW9uU3RvcmFnZUl0ZW0sXG4gIHNldE1lbW9yeVN0b3JhZ2VJdGVtLFxuICBzZXRTZXNzaW9uU3RvcmFnZUl0ZW0sXG4gIE1VTFRJX1NFTEVDVEVEX0VMRU1FTlRfS0VZUyxcbiAgSE9UX1JFTE9BRElORyxcbiAgSVNfRkxVU0hJTkcsXG4gIE9SSUdJTkFMX1NUT1JZQk9BUkRfVVJMLFxufSBmcm9tICcuL3Nlc3Npb25TdG9yYWdlVXRpbHMnO1xuaW1wb3J0IHtcbiAgTmF2VHJlZU5vZGUsXG4gIFNLSVBfUk9PVF9DT0RFQkFTRV9JRCxcbiAgYnVpbGROYXZGb3JOb2RlLFxuICBydW5OYXZUcmVlQnVpbHRDYWxsYmFja3MsXG59IGZyb20gJy4vbmF2VHJlZVV0aWxzJztcblxuLy8gQHRzLWlnbm9yZVxuaW1wb3J0ICQgZnJvbSAnanF1ZXJ5JztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge1xuICBPdXRsaW5lVHlwZSxcbiAgUFJJTUFSWV9PVVRMSU5FX0NPTE9VUixcbiAgY2xlYXJBbGxPdXRsaW5lcyxcbiAgZ2V0T3V0bGluZUVsZW1lbnQsXG4gIGlzTm9kZU91dGxpbmUsXG4gIHVwZGF0ZU91dGxpbmVzLFxufSBmcm9tICcuL291dGxpbmVVdGlscyc7XG5pbXBvcnQge1xuICBjc3NFdmFsLFxuICBnZXRDc3NFdmFscyxcbiAgZ2V0RWxlbWVudENsYXNzTGlzdCxcbiAgcHJvY2Vzc1J1bGVzRm9yU2VsZWN0ZWRFbGVtZW50LFxuICBydWxlTWF0Y2hlc0VsZW1lbnQsXG4gIHNldE1vZGlmaWVyc0ZvclNlbGVjdGVkRWxlbWVudCxcbn0gZnJvbSAnLi9jc3NGdW5jdGlvbnMnO1xuaW1wb3J0IHtcbiAgRklYRURfSUZSQU1FX01FU1NBR0VfSURTLFxuICBTRUxFQ1RfT1JfSE9WRVJfU1RPUllCT0FSRCxcbiAgU1RPUllCT0FSRF9IWURSQVRJT05fU1RBVFVTLFxufSBmcm9tICcuL2NvbnN0YW50c0FuZFR5cGVzJztcbmltcG9ydCB7XG4gIEFERF9DTEFTU19JTlNUQU5UX1VQREFURV9RVUVVRSxcbiAgVEVNUE9SQVJZX1NUWUxJTkdfQ0xBU1NfTkFNRSxcbiAgYXBwbHlDaGFuZ2VJdGVtVG9Eb2N1bWVudCxcbiAgdXBkYXRlQ29kZWJhc2VJZHMsXG59IGZyb20gJy4vY2hhbmdlSXRlbUZ1bmN0aW9ucyc7XG5pbXBvcnQge1xuICBidWlsZE5vZGVUcmVlLFxuICBidWlsZFRyZWVMb29rdXBNYXAsXG4gIGNsZWFyTG9va3Vwc0Zyb21UcmVlLFxuICBnZXRSb290UmVhY3RFbGVtZW50LFxufSBmcm9tICcuL3Jlc3FVdGlscyc7XG5pbXBvcnQgeyBUZW1wb0VsZW1lbnQgfSBmcm9tICcuL3RlbXBvRWxlbWVudCc7XG5pbXBvcnQge1xuICBBbnlDaGFuZ2VMZWRnZXJJdGVtLFxuICByZWNvbnN0cnVjdENoYW5nZUxlZGdlckNsYXNzLFxufSBmcm9tICcuL2NoYW5nZUxlZGdlclR5cGVzJztcbmltcG9ydCB7XG4gIGNhbkVkaXRUZXh0LFxuICBjdXJyZW50bHlFZGl0aW5nLFxuICBnZXRFZGl0aW5nSW5mbyxcbiAgc2V0dXBFZGl0YWJsZVRleHQsXG4gIHRlYXJkb3duRWRpdGFibGVUZXh0LFxufSBmcm9tICcuL2VkaXRUZXh0VXRpbHMnO1xuaW1wb3J0IHsgRGVib3VuY2VFeGVjdXRvciB9IGZyb20gJy4uL3V0aWxzL0RlYm91bmNlRXhlY3V0b3InO1xuaW1wb3J0IHsgZGVmYXVsdFVJVXBkYXRlUnVubmVyLCBVSVVwZGF0ZVJ1bm5lciB9IGZyb20gJy4vZG9tVXRpbHMnO1xuY29uc3QgUElYRUxTX1RPX01PVkVfQkVGT1JFX0RSQUcgPSAyMDtcblxuY29uc3QgSU1NRURJQVRFTFlfUkVNT1ZFX1BPSU5URVJfTE9DSyA9ICdJTU1FRElBVEVMWV9SRU1PVkVfUE9JTlRFUl9MT0NLJztcblxuY29uc3QgTEFTVF9OQVZfVFJFRV9SRUZSRVNIX1RJTUUgPSAnTEFTVF9OQVZfVFJFRV9SRUZSRVNIX1RJTUUnO1xuXG4vLyBUT0RPOiBDaGFuZ2UgYWxsIG9mIHRoaXMgdG8gYmUgYSByZWFjdCB3cmFwcGVyIGxpYnJhcnlcblxuZXhwb3J0IGNvbnN0IGluaXRDaGFubmVsTWVzc2FnaW5nRnVuY3Rpb25zID0gKCkgPT4ge1xuICAvLyBBbGwgcHJvY2Vzc2VzIHRoYXQgaW52b2x2ZXMgdXBkYXRpbmcgdGhlIFVJIHNob3VsZCB1c2UgdGhpcyBydW5uZXIgdG8gYXZvaWQgdHJpZ2dlcmluZyBhIGNhc2NhZGUgb2YgdXBkYXRlc1xuICBsZXQgZ2xvYmFsVUlVcGRhdGVSdW5uZXIgPSBkZWZhdWx0VUlVcGRhdGVSdW5uZXI7XG5cbiAgLy8gQHRzLWlnbm9yZVxuICBTdHJpbmcucHJvdG90eXBlLmhhc2hDb2RlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBoYXNoID0gMCxcbiAgICAgIGksXG4gICAgICBjaHI7XG4gICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gaGFzaDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgICAgY2hyID0gdGhpcy5jaGFyQ29kZUF0KGkpO1xuICAgICAgaGFzaCA9IChoYXNoIDw8IDUpIC0gaGFzaCArIGNocjtcbiAgICAgIGhhc2ggfD0gMDsgLy8gQ29udmVydCB0byAzMmJpdCBpbnRlZ2VyXG4gICAgfVxuICAgIHJldHVybiBoYXNoO1xuICB9O1xuXG4gIC8vIFdlIHdhbnQgdG8gbWFrZSBldmVudCBsaXN0ZW5lcnMgbm9uLXBhc3NpdmUsIGFuZCB0byBkbyBzbyBoYXZlIHRvIGNoZWNrXG4gIC8vIHRoYXQgYnJvd3NlcnMgc3VwcG9ydCBFdmVudExpc3RlbmVyT3B0aW9ucyBpbiB0aGUgZmlyc3QgcGxhY2UuXG4gIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9FdmVudFRhcmdldC9hZGRFdmVudExpc3RlbmVyI1NhZmVseV9kZXRlY3Rpbmdfb3B0aW9uX3N1cHBvcnRcbiAgbGV0IHBhc3NpdmVTdXBwb3J0ZWQgPSBmYWxzZTtcblxuICBjb25zdCBtYWtlUGFzc2l2ZUV2ZW50T3B0aW9uID0gKCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICBnZXQgcGFzc2l2ZSgpIHtcbiAgICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdoZW4gdGhlIGJyb3dzZXJcbiAgICAgICAgICAvLyAgIGF0dGVtcHRzIHRvIGFjY2VzcyB0aGUgcGFzc2l2ZSBwcm9wZXJ0eS5cbiAgICAgICAgICBwYXNzaXZlU3VwcG9ydGVkID0gdHJ1ZTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gb3B0aW9ucztcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHBhc3NpdmVTdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICAgIHJldHVybiBwYXNzaXZlU3VwcG9ydGVkO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogVGFrZW4gZnJvbTogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzIxOTc1OC9kZXRlY3QtY2hhbmdlcy1pbi10aGUtZG9tXG4gICAqXG4gICAqIFJldHVybnMgdGhlIGZ1bmN0aW9uIHRvIGRpc2Nvbm5lY3QgdGhlIG9ic2VydmVyXG4gICAqL1xuICBjb25zdCBvYnNlcnZlRE9NID0gKGZ1bmN0aW9uICgpIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgdmFyIE11dGF0aW9uT2JzZXJ2ZXIgPVxuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXIgfHwgd2luZG93LldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKG9ianM6IEhUTUxFbGVtZW50W10sIGNhbGxiYWNrOiAobXV0YXRpb25zOiBhbnkpID0+IHZvaWQpIHtcbiAgICAgIGNvbnN0IGZpbHRlcmVkT2JqcyA9IG9ianMuZmlsdGVyKChvYmopID0+IG9iaiAmJiBvYmoubm9kZVR5cGUgPT09IDEpO1xuXG4gICAgICBpZiAoZmlsdGVyZWRPYmpzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFVJVXBkYXRlUnVubmVyO1xuICAgICAgfVxuXG4gICAgICB2YXIgbXV0YXRpb25PYnNlcnZlcjogTXV0YXRpb25PYnNlcnZlcjtcblxuICAgICAgY29uc3QgdWlVcGRhdGVSdW5uZXIgPSAoaW5uZXJTY29wZTogKCkgPT4gdm9pZCkgPT4ge1xuICAgICAgICAvLyBQYXVzZSB0aGUgb2JzZXJ2ZXJcbiAgICAgICAgaWYgKG11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICAgICBtdXRhdGlvbk9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlubmVyU2NvcGUoKTtcblxuICAgICAgICAvLyBSZXN1bWUgdGhlIG9ic2VydmVyXG4gICAgICAgIGlmIChtdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgICAgZmlsdGVyZWRPYmpzLmZvckVhY2goKG9iaikgPT4ge1xuICAgICAgICAgICAgbXV0YXRpb25PYnNlcnZlci5vYnNlcnZlKG9iaiwge1xuICAgICAgICAgICAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgICAgICAgICAgIHN1YnRyZWU6IHRydWUsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHRydWUsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZU9sZFZhbHVlOiB0cnVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGlmIChNdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIG11dGF0aW9uT2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihjYWxsYmFjayk7XG5cbiAgICAgICAgZmlsdGVyZWRPYmpzLmZvckVhY2goKG9iaikgPT4ge1xuICAgICAgICAgIC8vIGhhdmUgdGhlIG9ic2VydmVyIG9ic2VydmUgZm9vIGZvciBjaGFuZ2VzIGluIGNoaWxkcmVuXG4gICAgICAgICAgbXV0YXRpb25PYnNlcnZlci5vYnNlcnZlKG9iaiwge1xuICAgICAgICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICAgICAgc3VidHJlZTogdHJ1ZSxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHRydWUsXG4gICAgICAgICAgICBhdHRyaWJ1dGVPbGRWYWx1ZTogdHJ1ZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGJyb3dzZXIgc3VwcG9ydCBmYWxsYmFja1xuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgZWxzZSBpZiAod2luZG93LmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgZmlsdGVyZWRPYmpzLmZvckVhY2goKG9iaikgPT4ge1xuICAgICAgICAgIG9iai5hZGRFdmVudExpc3RlbmVyKCdET01Ob2RlSW5zZXJ0ZWQnLCBjYWxsYmFjaywgZmFsc2UpO1xuICAgICAgICAgIG9iai5hZGRFdmVudExpc3RlbmVyKCdET01Ob2RlUmVtb3ZlZCcsIGNhbGxiYWNrLCBmYWxzZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdWlVcGRhdGVSdW5uZXI7XG4gICAgfTtcbiAgfSkoKTtcblxuICAvKipcbiAgICogV2hlbiBzZWxlY3RpbmcgaW4gbm9ybWFsIG1vZGUgKG5vdCBtZXRhIGtleSksIGNhbiBzZWxlY3Qgb25lIGxldmVsIGRvd24sIGEgc2libGluZ1xuICAgKiBvciBhIHBhcmVudCBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudFxuICAgKi9cbiAgY29uc3QgZ2V0U2VsZWN0YWJsZU5hdk5vZGUgPSAoZTogYW55KTogTmF2VHJlZU5vZGUgfCBudWxsIHwgc3RyaW5nID0+IHtcbiAgICBjb25zdCBzZWxlY3RlZEVsZW1lbnRLZXk6IHN0cmluZyA9XG4gICAgICBnZXRNZW1vcnlTdG9yYWdlSXRlbShTRUxFQ1RFRF9FTEVNRU5UX0tFWSk7XG4gICAgY29uc3Qgc2VsZWN0ZWRFbGVtZW50ID0gVGVtcG9FbGVtZW50LmZyb21LZXkoc2VsZWN0ZWRFbGVtZW50S2V5KTtcblxuICAgIGNvbnN0IGVsZW1lbnRLZXlUb05hdk5vZGUgPSBnZXRNZW1vcnlTdG9yYWdlSXRlbShFTEVNRU5UX0tFWV9UT19OQVZfTk9ERSk7XG5cbiAgICAvLyBNb3ZlIHVwIHRoZSB0cmVlIHVudGlsIHlvdSBmaW5kIHRoZSBmaXJzdCB2YWxpZCBuYXYgbm9kZVxuICAgIGxldCBmaXJzdE5hdk5vZGU6IE5hdlRyZWVOb2RlIHwgbnVsbCA9IG51bGw7XG4gICAgbGV0IHNlYXJjaE5vZGUgPSBlLnRhcmdldDtcbiAgICB3aGlsZSAoc2VhcmNoTm9kZSAmJiAhZmlyc3ROYXZOb2RlKSB7XG4gICAgICBmaXJzdE5hdk5vZGUgPVxuICAgICAgICBlbGVtZW50S2V5VG9OYXZOb2RlW2dldEVsZW1lbnRLZXlGcm9tTm9kZShzZWFyY2hOb2RlKSB8fCAnJ107XG4gICAgICBzZWFyY2hOb2RlID0gc2VhcmNoTm9kZS5wYXJlbnRFbGVtZW50O1xuICAgIH1cblxuICAgIGlmICghZmlyc3ROYXZOb2RlKSB7XG4gICAgICByZXR1cm4gU0VMRUNUX09SX0hPVkVSX1NUT1JZQk9BUkQ7XG4gICAgfVxuXG4gICAgY29uc3QgaXNOYXZOb2RlTWF0Y2ggPSAobmF2VHJlZU5vZGU6IE5hdlRyZWVOb2RlKTogYm9vbGVhbiA9PiB7XG4gICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzRW1wdHkoKSkge1xuICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uIGNhbm5vdCBiZSBjYWxsZWQgaWYgdGhlcmUgaXMgbm8gc2VsZWN0ZWQgZWxlbWVudCwgc2VlIGNvZGUgbG9naWMgYmVsb3cgdGhlIGZ1bmN0aW9uXG4gICAgICAgIHRocm93IEVycm9yKCdObyBzZWxlY3RlZCBlbGVtZW50IHdoZW4gaXNOYXZOb2RlTWF0Y2ggY2FsbGVkJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghbmF2VHJlZU5vZGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGVyZSBpcyBubyBjb2RlYmFzZSBJRCBpdCBzaG91bGQgbm90IGJlIHNlbGVjdGFibGUgYXMgdGhlcmUgaXMgbm90aGluZyB3ZSBjYW4gZG8gd2l0aCBpdFxuICAgICAgaWYgKFxuICAgICAgICAhbmF2VHJlZU5vZGUudGVtcG9FbGVtZW50LmNvZGViYXNlSWQuc3RhcnRzV2l0aCgndGVtcG8tJykgfHxcbiAgICAgICAgbmF2VHJlZU5vZGUudGVtcG9FbGVtZW50LmNvZGViYXNlSWQgPT09IFNLSVBfUk9PVF9DT0RFQkFTRV9JRFxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgaXQgbWF0Y2hlcywgd2UgYWxyZWFkeSBwYXNzZWQgYWxsIHBvc3NpYmxlIGNoaWxkcmVuLCBzbyByZS1zZWxlY3QgaXRcbiAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXNFcXVhbChuYXZUcmVlTm9kZS50ZW1wb0VsZW1lbnQpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBBbnkgcGFyZW50IGlzIG9rIHRvIHNlbGVjdFxuICAgICAgaWYgKG5hdlRyZWVOb2RlLnRlbXBvRWxlbWVudC5pc1BhcmVudE9mKHNlbGVjdGVkRWxlbWVudCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIHBhcmVudHNcbiAgICAgIC8vIFBpY2sgdGhlIGZpcnN0IHBhcmVudCB3aXRoIGEgY29kZWJhc2UgSURcbiAgICAgIGxldCBwYXJlbnQgPSBuYXZUcmVlTm9kZS5wYXJlbnQ7XG4gICAgICB3aGlsZSAocGFyZW50ICYmICFwYXJlbnQudGVtcG9FbGVtZW50LmNvZGViYXNlSWQuc3RhcnRzV2l0aCgndGVtcG8tJykpIHtcbiAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudDtcbiAgICAgIH1cblxuICAgICAgLy8gT25lIGxldmVsIGRvd25cbiAgICAgIGlmIChwYXJlbnQ/LnRlbXBvRWxlbWVudD8uaXNFcXVhbChzZWxlY3RlZEVsZW1lbnQpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBTaWJsaW5nIG9mIGFueSBwYXJlbnRcbiAgICAgIGNvbnN0IHNlbGVjdGVkTm9kZSA9IGVsZW1lbnRLZXlUb05hdk5vZGVbc2VsZWN0ZWRFbGVtZW50LmdldEtleSgpXTtcbiAgICAgIGlmIChcbiAgICAgICAgc2VsZWN0ZWROb2RlICYmXG4gICAgICAgIG5hdlRyZWVOb2RlLnBhcmVudD8uY2hpbGRyZW4/LmluY2x1ZGVzPy4oc2VsZWN0ZWROb2RlKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIGxldCBmb3VuZE5hdk5vZGU6IE5hdlRyZWVOb2RlIHwgbnVsbCA9IG51bGw7XG4gICAgbGV0IHNlYXJjaE5hdk5vZGU6IE5hdlRyZWVOb2RlIHwgdW5kZWZpbmVkID0gZmlyc3ROYXZOb2RlO1xuXG4gICAgd2hpbGUgKHNlYXJjaE5hdk5vZGUpIHtcbiAgICAgIGlmICghc2VsZWN0ZWRFbGVtZW50LmlzRW1wdHkoKSAmJiAhc2VsZWN0ZWRFbGVtZW50LmlzU3Rvcnlib2FyZCgpKSB7XG4gICAgICAgIC8vIElmIHRoZXJlIGlzIGEgc2VsZWN0ZWQgZWxlbWVudCBrZXkgbG9vcCBmcm9tIHRoaXMgZWxlbWVudCB1cCB0aGUgc3RhY2sgdG8gZmluZCB0aGUgZWxlbWVudCB0aGF0IGlzIHRoZSBkaXJlY3QgY2hpbGRcbiAgICAgICAgLy8gb2YgdGhlIGV4cGVjdGVkIHNlbGVjdGVkIGVsZW1lbnQsIHNvIHRoYXQgeW91IGNhbiBvbmx5IGhvdmVyIG9uZSBsZXZlbCBkZWVwZXIgdGhhbiB5b3UndmUgc2VsZWN0ZWRcbiAgICAgICAgaWYgKGlzTmF2Tm9kZU1hdGNoKHNlYXJjaE5hdk5vZGUpKSB7XG4gICAgICAgICAgZm91bmROYXZOb2RlID0gc2VhcmNoTmF2Tm9kZTtcbiAgICAgICAgICAvLyBFeGl0IHRoZSBsb29wIGFzIHdlIGZvdW5kIHRoZSBub2RlIHRoYXQgbWF0Y2hlc1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZiB0aGVyZSBpcyBubyBzZWxlY3RlZCBlbGVtZW50IGtleSwgb3IgdGhlIHNlbGVjdGlvbiBpcyB0aGUgc3Rvcnlib2FyZCBpdHNlbGYsIGxvb3AgdXAgdG8gdGhlIHRvcC1tb3N0IGVsZW1lbnQgd2l0aCBhIGNvZGViYXNlIElEXG4gICAgICAgIGlmIChcbiAgICAgICAgICBzZWFyY2hOYXZOb2RlLnRlbXBvRWxlbWVudC5jb2RlYmFzZUlkICYmXG4gICAgICAgICAgc2VhcmNoTmF2Tm9kZS50ZW1wb0VsZW1lbnQuY29kZWJhc2VJZC5zdGFydHNXaXRoKCd0ZW1wby0nKVxuICAgICAgICApIHtcbiAgICAgICAgICBmb3VuZE5hdk5vZGUgPSBzZWFyY2hOYXZOb2RlO1xuICAgICAgICAgIC8vIE5vdGU6IHdlIGRvIG5vdCBleGl0IHRoZSBsb29wIGhlcmUgYXMgd2Ugd2FudCB0byBrZWVwIHNlYXJjaGluZyBmb3IgdGhlIHRvcC1tb3N0IGVsZW1lbnRcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBzZWFyY2hOYXZOb2RlID0gc2VhcmNoTmF2Tm9kZS5wYXJlbnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZvdW5kTmF2Tm9kZSB8fCBudWxsO1xuICB9O1xuXG4gIGNvbnN0IG9uUG9pbnRlck92ZXIgPSAoXG4gICAgZTogYW55LFxuICAgIHBhcmVudFBvcnQ6IGFueSxcbiAgICBzdG9yeWJvYXJkSWQ6IHN0cmluZyxcbiAgICBzZWxlY3RCb3R0b21Nb3N0RWxlbWVudD86IGJvb2xlYW4sXG4gICkgPT4ge1xuICAgIGNvbnN0IHBhc3NlZFRocm91Z2ggPSBwYXNzVGhyb3VnaEV2ZW50c0lmTmVlZGVkKFxuICAgICAgZSxcbiAgICAgIHBhcmVudFBvcnQsXG4gICAgICBzdG9yeWJvYXJkSWQsXG4gICAgKTtcbiAgICBjb25zdCBlZGl0aW5nVGV4dEluZm8gPSBnZXRFZGl0aW5nSW5mbygpO1xuXG4gICAgLy8gQWxsb3cgb24gcG9pbnRlciBvdmVyIGV2ZW50cyBpZiBlZGl0aW5nIChzbyB3ZSBjYW4gY2xpY2sgb3V0KVxuICAgIGlmIChlLmFsdEtleSB8fCAocGFzc2VkVGhyb3VnaCAmJiAhZWRpdGluZ1RleHRJbmZvKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChnZXRNZW1vcnlTdG9yYWdlSXRlbSgnbW91c2VEcmFnQ29udGV4dCcpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY3VycmVudEhvdmVyZWRLZXkgPSBnZXRNZW1vcnlTdG9yYWdlSXRlbShIT1ZFUkVEX0VMRU1FTlRfS0VZKTtcblxuICAgIGNvbnN0IGVsZW1lbnRLZXlUb05hdk5vZGUgPVxuICAgICAgZ2V0TWVtb3J5U3RvcmFnZUl0ZW0oRUxFTUVOVF9LRVlfVE9fTkFWX05PREUpIHx8IHt9O1xuXG4gICAgbGV0IGhvdmVyZWROYXZOb2RlOiBOYXZUcmVlTm9kZSB8IG51bGwgfCBzdHJpbmc7XG4gICAgaWYgKGUubWV0YUtleSB8fCBlLmN0cmxLZXkgfHwgc2VsZWN0Qm90dG9tTW9zdEVsZW1lbnQpIHtcbiAgICAgIGNvbnN0IGVsZW1lbnRLZXk6IGFueSA9IGdldEVsZW1lbnRLZXlGcm9tTm9kZShlLnRhcmdldCk7XG4gICAgICBob3ZlcmVkTmF2Tm9kZSA9IGVsZW1lbnRLZXlUb05hdk5vZGVbZWxlbWVudEtleV07XG5cbiAgICAgIC8vIFNwZWNpYWwgY2FzZSAtPiB0aGlzIGlzIHRoZSB0b3AtbW9zdCBub2RlIHNvIGl0IHNob3VsZCB0cmlnZ2VyIGEgaG92ZXIgb24gdGhlIHN0b3J5Ym9hcmRcbiAgICAgIGlmICghaG92ZXJlZE5hdk5vZGUgJiYgZS50YXJnZXQucGFyZW50Tm9kZSA9PT0gZG9jdW1lbnQuYm9keSkge1xuICAgICAgICBob3ZlcmVkTmF2Tm9kZSA9IFNFTEVDVF9PUl9IT1ZFUl9TVE9SWUJPQVJEO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBob3ZlcmVkTmF2Tm9kZSA9IGdldFNlbGVjdGFibGVOYXZOb2RlKGUpO1xuICAgIH1cblxuICAgIGNvbnN0IGN1cnJlbnRTZWxlY3RlZEtleSA9IGdldE1lbW9yeVN0b3JhZ2VJdGVtKFNFTEVDVEVEX0VMRU1FTlRfS0VZKTtcbiAgICBjb25zdCBjdXJyZW50U2VsZWN0ZWRFbGVtZW50ID0gVGVtcG9FbGVtZW50LmZyb21LZXkoY3VycmVudFNlbGVjdGVkS2V5KTtcblxuICAgIC8vIElmIHRoZSB1c2VyIGlzIGhvbGRpbmcgc2hpZnQsIG9ubHkgYWxsb3cgc2VsZWN0aW5nIHNpYmxpbmdzXG4gICAgaWYgKGUuc2hpZnRLZXkgJiYgaG92ZXJlZE5hdk5vZGUgJiYgY3VycmVudFNlbGVjdGVkS2V5KSB7XG4gICAgICAvLyBUcnlpbmcgdG8gc2VsZWN0IHRoZSBlbnRpcmUgc3Rvcnlib2FyZCwgYWxsb3cgb25seSBpZiB0aGUgb3RoZXIgc2VsZWN0ZWQgZWxlbWVudCBpcyBhbHNvIGEgc3Rvcnlib2FyZFxuICAgICAgaWYgKFxuICAgICAgICB0eXBlb2YgaG92ZXJlZE5hdk5vZGUgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICFjdXJyZW50U2VsZWN0ZWRFbGVtZW50LmlzU3Rvcnlib2FyZCgpXG4gICAgICApIHtcbiAgICAgICAgaG92ZXJlZE5hdk5vZGUgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBpZiAoXG4gICAgICAgIHR5cGVvZiBob3ZlcmVkTmF2Tm9kZSAhPT0gJ3N0cmluZycgJiZcbiAgICAgICAgIWhvdmVyZWROYXZOb2RlPy50ZW1wb0VsZW1lbnQuaXNTaWJsaW5nT2YoY3VycmVudFNlbGVjdGVkRWxlbWVudClcbiAgICAgICkge1xuICAgICAgICBob3ZlcmVkTmF2Tm9kZSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFob3ZlcmVkTmF2Tm9kZSkge1xuICAgICAgaWYgKGN1cnJlbnRIb3ZlcmVkS2V5ICE9PSBudWxsKSB7XG4gICAgICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKEhPVkVSRURfRUxFTUVOVF9LRVksIG51bGwpO1xuICAgICAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICBpZDogRklYRURfSUZSQU1FX01FU1NBR0VfSURTLkhPVkVSRURfRUxFTUVOVF9LRVksXG4gICAgICAgICAgZWxlbWVudEtleTogbnVsbCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdXBkYXRlT3V0bGluZXMocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgaG92ZXJlZE5hdk5vZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBpZiAoaG92ZXJlZE5hdk5vZGUgPT09IFNFTEVDVF9PUl9IT1ZFUl9TVE9SWUJPQVJEKSB7XG4gICAgICAgIGNvbnN0IHN0b3J5Ym9hcmRLZXkgPSBUZW1wb0VsZW1lbnQuZm9yU3Rvcnlib2FyZChzdG9yeWJvYXJkSWQpLmdldEtleSgpO1xuXG4gICAgICAgIGlmIChjdXJyZW50SG92ZXJlZEtleSAhPT0gc3Rvcnlib2FyZEtleSkge1xuICAgICAgICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKEhPVkVSRURfRUxFTUVOVF9LRVksIHN0b3J5Ym9hcmRLZXkpO1xuXG4gICAgICAgICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICBpZDogRklYRURfSUZSQU1FX01FU1NBR0VfSURTLkhPVkVSRURfRUxFTUVOVF9LRVksXG4gICAgICAgICAgICBlbGVtZW50S2V5OiBzdG9yeWJvYXJkS2V5LFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdXBkYXRlT3V0bGluZXMocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcG9FbGVtZW50S2V5ID0gaG92ZXJlZE5hdk5vZGUudGVtcG9FbGVtZW50LmdldEtleSgpO1xuXG4gICAgaWYgKGN1cnJlbnRIb3ZlcmVkS2V5ICE9PSB0ZW1wb0VsZW1lbnRLZXkpIHtcbiAgICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgICBpZDogRklYRURfSUZSQU1FX01FU1NBR0VfSURTLkhPVkVSRURfRUxFTUVOVF9LRVksXG4gICAgICAgIGVsZW1lbnRLZXk6IHRlbXBvRWxlbWVudEtleSxcbiAgICAgIH0pO1xuICAgICAgc2V0TWVtb3J5U3RvcmFnZUl0ZW0oSE9WRVJFRF9FTEVNRU5UX0tFWSwgdGVtcG9FbGVtZW50S2V5KTtcbiAgICAgIHVwZGF0ZU91dGxpbmVzKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGNsZWFySG92ZXJlZEVsZW1lbnRzID0gKHBhcmVudFBvcnQ6IGFueSwgc3Rvcnlib2FyZElkOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBjdXJyZW50SG92ZXJlZEtleSA9IGdldE1lbW9yeVN0b3JhZ2VJdGVtKEhPVkVSRURfRUxFTUVOVF9LRVkpO1xuXG4gICAgaWYgKCFjdXJyZW50SG92ZXJlZEtleSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgaWQ6IEZJWEVEX0lGUkFNRV9NRVNTQUdFX0lEUy5IT1ZFUkVEX0VMRU1FTlRfS0VZLFxuICAgICAgZWxlbWVudEtleTogbnVsbCxcbiAgICB9KTtcbiAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbShIT1ZFUkVEX0VMRU1FTlRfS0VZLCBudWxsKTtcblxuICAgIHVwZGF0ZU91dGxpbmVzKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gIH07XG5cbiAgY29uc3Qgb25Qb2ludGVyTW92ZSA9IGFzeW5jIChcbiAgICBlOiBhbnksXG4gICAgcGFyZW50UG9ydDogYW55LFxuICAgIHN0b3J5Ym9hcmRJZDogc3RyaW5nLFxuICApID0+IHtcbiAgICBwYXNzVGhyb3VnaEV2ZW50c0lmTmVlZGVkKGUsIHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG5cbiAgICAvLyBJZiBubyBidXR0b25zIGFyZSBwcmVzc2VkIHRoZSBkcmFnIGVuZCBldmVudCBtYXkgbm90IGhhdmUgY29ycmVjdGx5IHRyaWdnZXJlZFxuICAgIC8vIHJlc2V0IHRoZSBkcmFnIHN0YXRlXG4gICAgbGV0IG1vdXNlRHJhZ0RhdGEgPSBnZXRNZW1vcnlTdG9yYWdlSXRlbSgnbW91c2VEcmFnQ29udGV4dCcpO1xuICAgIGlmICghZS5idXR0b25zICYmIG1vdXNlRHJhZ0RhdGEpIHtcbiAgICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKCdtb3VzZURyYWdDb250ZXh0JywgbnVsbCk7XG5cbiAgICAgIGlmIChtb3VzZURyYWdEYXRhPy5kcmFnZ2luZykge1xuICAgICAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICBpZDogRklYRURfSUZSQU1FX01FU1NBR0VfSURTLkRSQUdfQ0FOQ0VMX0VWRU5ULFxuICAgICAgICAgIGV2ZW50OiB7fSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIG1vdXNlRHJhZ0RhdGEgPSBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydGFudEZpZWxkcyA9IHtcbiAgICAgIHBhZ2VYOiBlLnBhZ2VYLFxuICAgICAgcGFnZVk6IGUucGFnZVksXG5cbiAgICAgIGNsaWVudFg6IGUuY2xpZW50WCxcbiAgICAgIGNsaWVudFk6IGUuY2xpZW50WSxcbiAgICB9O1xuXG4gICAgc2V0TWVtb3J5U3RvcmFnZUl0ZW0oJ21vdXNlUG9zJywgaW1wb3J0YW50RmllbGRzKTtcblxuICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgaWQ6IEZJWEVEX0lGUkFNRV9NRVNTQUdFX0lEUy5NT1VTRV9NT1ZFX0VWRU5ULFxuICAgICAgZXZlbnQ6IGltcG9ydGFudEZpZWxkcyxcbiAgICB9KTtcblxuICAgIGlmIChtb3VzZURyYWdEYXRhICYmICFtb3VzZURyYWdEYXRhLmRyYWdnaW5nKSB7XG4gICAgICBjb25zdCB6b29tUGVyYyA9IGdldE1lbW9yeVN0b3JhZ2VJdGVtKCd6b29tUGVyYycpIHx8IDE7XG5cbiAgICAgIGNvbnN0IHRvdGFsTW92ZW1lbnRQaXhlbHMgPVxuICAgICAgICBNYXRoLmFicyhtb3VzZURyYWdEYXRhLnBhZ2VYIC0gZS5wYWdlWCkgK1xuICAgICAgICBNYXRoLmFicyhtb3VzZURyYWdEYXRhLnBhZ2VZIC0gZS5wYWdlWSk7XG4gICAgICAvLyBTdGFydCB0aGUgZHJhZyBldmVudCBpZiB0aGUgdXNlciBoYXMgbW92ZWQgZW5vdWdoXG4gICAgICBpZiAodG90YWxNb3ZlbWVudFBpeGVscyA+PSBQSVhFTFNfVE9fTU9WRV9CRUZPUkVfRFJBRyAvIHpvb21QZXJjKSB7XG4gICAgICAgIC8vIFJlc2VsZWN0IHRoZSBwYXJlbnQgaWYgdGhlcmUgd2FzIG9uZSB0byBzZWxlY3RcbiAgICAgICAgaWYgKG1vdXNlRHJhZ0RhdGEucGFyZW50U2VsZWN0ZWRFbGVtZW50S2V5KSB7XG4gICAgICAgICAgY29uc3QgZWxlbWVudEtleVRvTmF2Tm9kZSA9XG4gICAgICAgICAgICBnZXRNZW1vcnlTdG9yYWdlSXRlbShFTEVNRU5UX0tFWV9UT19OQVZfTk9ERSkgfHwge307XG4gICAgICAgICAgY29uc3QgbmF2Tm9kZVRvU2VsZWN0ID1cbiAgICAgICAgICAgIGVsZW1lbnRLZXlUb05hdk5vZGVbbW91c2VEcmFnRGF0YS5wYXJlbnRTZWxlY3RlZEVsZW1lbnRLZXldO1xuXG4gICAgICAgICAgaWYgKG5hdk5vZGVUb1NlbGVjdCkge1xuICAgICAgICAgICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgIGlkOiBGSVhFRF9JRlJBTUVfTUVTU0FHRV9JRFMuU0VMRUNURURfRUxFTUVOVF9LRVksXG4gICAgICAgICAgICAgIGVsZW1lbnRLZXk6IG1vdXNlRHJhZ0RhdGEucGFyZW50U2VsZWN0ZWRFbGVtZW50S2V5LFxuICAgICAgICAgICAgICBvdXRlckhUTUw6ICQoXG4gICAgICAgICAgICAgICAgYC4ke0VMRU1FTlRfS0VZX1BSRUZJWH0ke21vdXNlRHJhZ0RhdGEucGFyZW50U2VsZWN0ZWRFbGVtZW50S2V5fWAsXG4gICAgICAgICAgICAgICkuZ2V0KDApPy5vdXRlckhUTUwsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKFxuICAgICAgICAgICAgICBTRUxFQ1RFRF9FTEVNRU5UX0tFWSxcbiAgICAgICAgICAgICAgbW91c2VEcmFnRGF0YS5wYXJlbnRTZWxlY3RlZEVsZW1lbnRLZXksXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFpQ29udGV4dFNlbGVjdGlvbiA9IGdldE1lbW9yeVN0b3JhZ2VJdGVtKCdhaUNvbnRleHQnKTtcblxuICAgICAgICAvLyBEb24ndCBlbmFibGUgZHJhZ2dpbmcgaWYgdGhlIEFJIGNvbnRleHQgaXMgZW5hYmxlZFxuICAgICAgICBpZiAoIWFpQ29udGV4dFNlbGVjdGlvbikge1xuICAgICAgICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKCdtb3VzZURyYWdDb250ZXh0Jywge1xuICAgICAgICAgICAgLi4ubW91c2VEcmFnRGF0YSxcbiAgICAgICAgICAgIGRyYWdnaW5nOiB0cnVlLFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgY29uc3Qgc2VsZWN0ZWRFbGVtZW50S2V5ID0gZ2V0TWVtb3J5U3RvcmFnZUl0ZW0oU0VMRUNURURfRUxFTUVOVF9LRVkpO1xuICAgICAgICAgIGNvbnN0IHNlbGVjdGVkRWxlbWVudCA9ICQoXG4gICAgICAgICAgICBgLiR7RUxFTUVOVF9LRVlfUFJFRklYfSR7c2VsZWN0ZWRFbGVtZW50S2V5fWAsXG4gICAgICAgICAgKS5nZXQoMCk7XG5cbiAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSBkcmFnIHN0YXJ0IGV2ZW50XG4gICAgICAgICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICBpZDogRklYRURfSUZSQU1FX01FU1NBR0VfSURTLkRSQUdfU1RBUlRfRVZFTlQsXG4gICAgICAgICAgICBldmVudDogbW91c2VEcmFnRGF0YSxcbiAgICAgICAgICAgIG91dGVySFRNTDogc2VsZWN0ZWRFbGVtZW50Py5vdXRlckhUTUwsXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBjb25zdCBib2R5T2JqZWN0ID0gJCgnYm9keScpLmdldCgwKTtcblxuICAgICAgICAgIC8vIEhBQ0s6IE1hcmNoIDgsIDIwMjRcbiAgICAgICAgICAvLyBXaXRob3V0IHRoaXMgd29ya2Fyb3VuZCBldmVudHMgc3RheSBpbnNpZGUgdGhlIGlmcmFtZSBzbyBpdCdzIG5vdCBwb3NzaWJsZSB0b1xuICAgICAgICAgIC8vIHRyYWNrIG1vdXNlIG1vdmVtZW50cyBvdXRzaWRlIHRoZSBpZnJhbWUgd2hlbiBjbGlja2luZyAmIGRyYWdnaW5nLlxuICAgICAgICAgIC8vIFNldCB0aGUgcG9pbnRlciBsb2NrIGFuZCBpbW1lZGlhdGVseSByZW1vdmUgaXQgc28gdGhhdFxuICAgICAgICAgIC8vIHRoZSBldmVudHMgc3RhcnQgdG8gcHJvcGFnYXRlIHVwd2FyZHMgaW4gdGhlIG91dGVyIGFwcGxpY2F0aW9uLlxuICAgICAgICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKElNTUVESUFURUxZX1JFTU9WRV9QT0lOVEVSX0xPQ0ssIHRydWUpO1xuICAgICAgICAgIGF3YWl0IGJvZHlPYmplY3Q/LnJlcXVlc3RQb2ludGVyTG9jaygpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGdldE1lbW9yeVN0b3JhZ2VJdGVtKCdtb3VzZURyYWdDb250ZXh0JykpIHtcbiAgICAgIHVwZGF0ZU91dGxpbmVzKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGdldFBhcmVudERvbUVsZW1lbnRGb3JOYXZOb2RlID0gKG5hdk5vZGU6IE5hdlRyZWVOb2RlKSA9PiB7XG4gICAgaWYgKCFuYXZOb2RlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIW5hdk5vZGU/LmlzQ29tcG9uZW50KSB7XG4gICAgICBjb25zdCBjaGlsZERvbUVsZW1lbnQgPSAkKFxuICAgICAgICBgLiR7RUxFTUVOVF9LRVlfUFJFRklYfSR7bmF2Tm9kZS50ZW1wb0VsZW1lbnQuZ2V0S2V5KCl9YCxcbiAgICAgICkuZ2V0KDApO1xuICAgICAgcmV0dXJuIGNoaWxkRG9tRWxlbWVudD8ucGFyZW50RWxlbWVudDtcbiAgICB9XG5cbiAgICAvLyBUaGlzIGlzIHRoZSBsaXN0IG9mIHJlYWwgRE9NIGVsZW1lbnRzIHRoYXQgYXJlIGF0IHRoZSB0b3AgbGV2ZWwgb2YgdGhpcyBjb21wb25lbnRcbiAgICBjb25zdCBlbGVtZW50S2V5VG9Mb29rdXBMaXN0OiBhbnkgPVxuICAgICAgZ2V0TWVtb3J5U3RvcmFnZUl0ZW0oRUxFTUVOVF9LRVlfVE9fTE9PS1VQX0xJU1QpIHx8IHt9O1xuXG4gICAgY29uc3QgbG9va3VwTGlzdCA9XG4gICAgICBlbGVtZW50S2V5VG9Mb29rdXBMaXN0W25hdk5vZGUudGVtcG9FbGVtZW50LmdldEtleSgpXSB8fCBbXTtcbiAgICBsZXQgY2hpbGREb21FbGVtZW50OiBhbnk7XG4gICAgbG9va3VwTGlzdC5mb3JFYWNoKChsb29rdXBFbGVtZW50S2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIGlmIChjaGlsZERvbUVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjaGlsZERvbUVsZW1lbnQgPSAkKGAuJHtFTEVNRU5UX0tFWV9QUkVGSVh9JHtsb29rdXBFbGVtZW50S2V5fWApLmdldCgwKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBjaGlsZERvbUVsZW1lbnQ/LnBhcmVudEVsZW1lbnQ7XG4gIH07XG5cbiAgY29uc3Qgb25Qb2ludGVyRG93biA9IChlOiBhbnksIHBhcmVudFBvcnQ6IGFueSwgc3Rvcnlib2FyZElkOiBzdHJpbmcpID0+IHtcbiAgICAvLyBUaGlzIHZhcmlhYmxlIGRldGVybWluZXMgd2hpY2ggYnV0dG9uIHdhcyB1c2VkXG4gICAgLy8gMSAtPiBsZWZ0LCAyIC0+IG1pZGRsZSwgMyAtPiByaWdodFxuICAgIGlmIChlLndoaWNoICE9PSAxKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQWxsb3cgdGhlIGVkaXQgZHluYW1pYyB0ZXh0IGJ1dHRvbiB0byBiZSBjbGlja2VkXG4gICAgaWYgKGhhc0NsYXNzKGUudGFyZ2V0LCBFRElUX1RFWFRfQlVUVE9OKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHBhc3NlZFRocm91Z2ggPSBwYXNzVGhyb3VnaEV2ZW50c0lmTmVlZGVkKFxuICAgICAgZSxcbiAgICAgIHBhcmVudFBvcnQsXG4gICAgICBzdG9yeWJvYXJkSWQsXG4gICAgKTtcbiAgICBpZiAocGFzc2VkVGhyb3VnaCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHNlbGVjdGVkRWxlbWVudEtleSA9IGdldE1lbW9yeVN0b3JhZ2VJdGVtKFNFTEVDVEVEX0VMRU1FTlRfS0VZKTtcbiAgICBjb25zdCBzZWxlY3RlZEVsZW1lbnQgPSBUZW1wb0VsZW1lbnQuZnJvbUtleShzZWxlY3RlZEVsZW1lbnRLZXkpO1xuICAgIGNvbnN0IHNlbGVjdGVkTmF2Tm9kZSA9IG9uU2VsZWN0RWxlbWVudChlLCBwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuXG4gICAgY29uc3QgdXNlU2VsZWN0ZWRJZkRyYWdnaW5nID1cbiAgICAgICFzZWxlY3RlZEVsZW1lbnQuaXNFbXB0eSgpICYmXG4gICAgICBzZWxlY3RlZEVsZW1lbnQuaXNQYXJlbnRPZihzZWxlY3RlZE5hdk5vZGU/LnRlbXBvRWxlbWVudCk7XG5cbiAgICBsZXQgb2Zmc2V0WCwgb2Zmc2V0WTtcblxuICAgIGlmIChzZWxlY3RlZE5hdk5vZGU/LnBhZ2VCb3VuZGluZ0JveCkge1xuICAgICAgb2Zmc2V0WCA9XG4gICAgICAgIHNlbGVjdGVkTmF2Tm9kZS5wYWdlQm91bmRpbmdCb3gucGFnZVggK1xuICAgICAgICBzZWxlY3RlZE5hdk5vZGUucGFnZUJvdW5kaW5nQm94LndpZHRoIC8gMiAtXG4gICAgICAgIGUucGFnZVg7XG4gICAgICBvZmZzZXRZID1cbiAgICAgICAgc2VsZWN0ZWROYXZOb2RlLnBhZ2VCb3VuZGluZ0JveC5wYWdlWSArXG4gICAgICAgIHNlbGVjdGVkTmF2Tm9kZS5wYWdlQm91bmRpbmdCb3guaGVpZ2h0IC8gMiAtXG4gICAgICAgIGUucGFnZVk7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0YW50RmllbGRzOiBhbnkgPSB7XG4gICAgICBwYWdlWDogZS5wYWdlWCxcbiAgICAgIHBhZ2VZOiBlLnBhZ2VZLFxuXG4gICAgICAvLyBUaGUgZGlmZmVyZW5jZSBiZXR3ZWVuIHdoZXJlIHRoZSB1c2VyIGNsaWNrZWQgYW5kIHRoZSBjZW50ZXIgb2YgdGhlIGVsZW1lbnRcbiAgICAgIG9mZnNldFgsXG4gICAgICBvZmZzZXRZLFxuXG4gICAgICAvLyBVc2VkIHRvIHJlc2VsZWN0IHRoZSBwYXJlbnQgaWYgdGhlIHVzZXIgc3RhcnRzIHRvIG1vdmVcbiAgICAgIHBhcmVudFNlbGVjdGVkRWxlbWVudEtleTogdXNlU2VsZWN0ZWRJZkRyYWdnaW5nXG4gICAgICAgID8gc2VsZWN0ZWRFbGVtZW50S2V5XG4gICAgICAgIDogbnVsbCxcbiAgICB9O1xuXG4gICAgY29uc3QgZWxlbWVudEtleVRvTmF2Tm9kZSA9XG4gICAgICBnZXRNZW1vcnlTdG9yYWdlSXRlbShFTEVNRU5UX0tFWV9UT19OQVZfTk9ERSkgfHwge307XG5cbiAgICAvLyBHZXQgdGhlIHBhcmVudCBlbGVtZW50IChhY3R1YWwgRE9NIGVsZW1lbnQpIHRoYXQgdGhpcyBub2RlIGlzIGJlaW5nIGRyYWdnZWQgaW5zaWRlXG4gICAgLy8gVG8gZG8gdGhpcyBwaWNrIG9uZSBjaGlsZCBlbGVtZW50IHRoYXQgaXMgYmVpbmcgZHJhZ2dlZCAoY2FuIGJlIG11bHRpcGxlIGNoaWxkcmVuIGlmIHRoZSBub2RlIGJlaW5nIGRyYWdnZWQgaXMgYSBjb21wb25lbnQpLFxuICAgIC8vIGFuZCBnZXQgaXRzIHBhcmVudCBpbiB0aGUgRE9NXG4gICAgY29uc3QgbmF2Tm9kZVRvVXNlRm9yRHJhZ2dpbmcgPSB1c2VTZWxlY3RlZElmRHJhZ2dpbmdcbiAgICAgID8gZWxlbWVudEtleVRvTmF2Tm9kZVtzZWxlY3RlZEVsZW1lbnRLZXldXG4gICAgICA6IHNlbGVjdGVkTmF2Tm9kZTtcblxuICAgIGNvbnN0IHBhcmVudERvbUVsZW1lbnQgPSBnZXRQYXJlbnREb21FbGVtZW50Rm9yTmF2Tm9kZShcbiAgICAgIG5hdk5vZGVUb1VzZUZvckRyYWdnaW5nLFxuICAgICk7XG5cbiAgICBpZiAocGFyZW50RG9tRWxlbWVudCkge1xuICAgICAgaW1wb3J0YW50RmllbGRzWydzZWxlY3RlZFBhcmVudERpc3BsYXknXSA9IGNzc0V2YWwoXG4gICAgICAgIHBhcmVudERvbUVsZW1lbnQsXG4gICAgICAgICdkaXNwbGF5JyxcbiAgICAgICk7XG4gICAgICBpbXBvcnRhbnRGaWVsZHNbJ3NlbGVjdGVkUGFyZW50RmxleERpcmVjdGlvbiddID0gY3NzRXZhbChcbiAgICAgICAgcGFyZW50RG9tRWxlbWVudCxcbiAgICAgICAgJ2ZsZXgtZGlyZWN0aW9uJyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3QgYWlDb250ZXh0U2VsZWN0aW9uID0gZ2V0TWVtb3J5U3RvcmFnZUl0ZW0oJ2FpQ29udGV4dCcpO1xuXG4gICAgLy8gRG9uJ3QgZW5hYmxlIGRyYWdnaW5nIGlmIHRoZSBBSSBjb250ZXh0IGlzIGVuYWJsZWRcbiAgICBpZiAoIWFpQ29udGV4dFNlbGVjdGlvbikge1xuICAgICAgc2V0TWVtb3J5U3RvcmFnZUl0ZW0oJ21vdXNlRHJhZ0NvbnRleHQnLCBpbXBvcnRhbnRGaWVsZHMpO1xuICAgIH1cblxuICAgIHVwZGF0ZU91dGxpbmVzKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gIH07XG5cbiAgY29uc3Qgb25Qb2ludGVyVXAgPSAoZTogYW55LCBwYXJlbnRQb3J0OiBhbnksIHN0b3J5Ym9hcmRJZDogc3RyaW5nKSA9PiB7XG4gICAgcGFzc1Rocm91Z2hFdmVudHNJZk5lZWRlZChlLCBwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuXG4gICAgY29uc3QgbW91c2VEcmFnRGF0YSA9IGdldE1lbW9yeVN0b3JhZ2VJdGVtKCdtb3VzZURyYWdDb250ZXh0Jyk7XG5cbiAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbSgnbW91c2VEcmFnQ29udGV4dCcsIG51bGwpO1xuXG4gICAgaWYgKG1vdXNlRHJhZ0RhdGE/LmRyYWdnaW5nKSB7XG4gICAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgaWQ6IEZJWEVEX0lGUkFNRV9NRVNTQUdFX0lEUy5EUkFHX0VORF9FVkVOVCxcbiAgICAgICAgZXZlbnQ6IHt9LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdXBkYXRlT3V0bGluZXMocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgfTtcblxuICBjb25zdCBvblNlbGVjdEVsZW1lbnQgPSAoXG4gICAgZTogYW55LFxuICAgIHBhcmVudFBvcnQ6IGFueSxcbiAgICBzdG9yeWJvYXJkSWQ6IHN0cmluZyxcbiAgKTogTmF2VHJlZU5vZGUgfCBudWxsID0+IHtcbiAgICBjb25zdCBkcml2ZU1vZGVFbmFibGVkID0gISFnZXRTZXNzaW9uU3RvcmFnZUl0ZW0oXG4gICAgICAnZHJpdmVNb2RlRW5hYmxlZCcsXG4gICAgICBzdG9yeWJvYXJkSWQsXG4gICAgKTtcblxuICAgIGlmIChkcml2ZU1vZGVFbmFibGVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBlbGVtZW50S2V5VG9OYXZOb2RlID1cbiAgICAgIGdldE1lbW9yeVN0b3JhZ2VJdGVtKEVMRU1FTlRfS0VZX1RPX05BVl9OT0RFKSB8fCB7fTtcblxuICAgIGxldCBzZWxlY3RlZE5hdk5vZGU6IE5hdlRyZWVOb2RlIHwgbnVsbCB8IHN0cmluZztcbiAgICBpZiAoZS5tZXRhS2V5IHx8IGUuY3RybEtleSkge1xuICAgICAgY29uc3QgZWxlbWVudEtleTogYW55ID0gZ2V0RWxlbWVudEtleUZyb21Ob2RlKGUudGFyZ2V0KTtcbiAgICAgIHNlbGVjdGVkTmF2Tm9kZSA9IGVsZW1lbnRLZXlUb05hdk5vZGVbZWxlbWVudEtleV07XG5cbiAgICAgIC8vIFNwZWNpYWwgY2FzZSAtPiB0aGlzIGlzIHRoZSB0b3AtbW9zdCBub2RlIHNvIGl0IHNob3VsZCB0cmlnZ2VyIGEgc2VsZWN0IG9uIHRoZSBzdG9yeWJvYXJkXG4gICAgICBpZiAoIXNlbGVjdGVkTmF2Tm9kZSAmJiBlLnRhcmdldC5wYXJlbnROb2RlID09PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgIHNlbGVjdGVkTmF2Tm9kZSA9IFNFTEVDVF9PUl9IT1ZFUl9TVE9SWUJPQVJEO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzZWxlY3RlZE5hdk5vZGUgPSBnZXRTZWxlY3RhYmxlTmF2Tm9kZShlKTtcbiAgICB9XG5cbiAgICBjb25zdCBjdXJyZW50U2VsZWN0ZWRFbGVtZW50S2V5ID1cbiAgICAgIGdldE1lbW9yeVN0b3JhZ2VJdGVtKFNFTEVDVEVEX0VMRU1FTlRfS0VZKTtcblxuICAgIC8vIElmIHRoaXMgaXMgbm90IGEgdmFsaWQgbmF2IG5vZGUsIGl0J3Mgbm90IHNvbWV0aGluZyB3ZSB0cmFjayAtIGRlc2VsZWN0IGFsbFxuICAgIGlmICghc2VsZWN0ZWROYXZOb2RlKSB7XG4gICAgICBpZiAoY3VycmVudFNlbGVjdGVkRWxlbWVudEtleSkge1xuICAgICAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICBpZDogRklYRURfSUZSQU1FX01FU1NBR0VfSURTLlNFTEVDVEVEX0VMRU1FTlRfS0VZLFxuICAgICAgICAgIGVsZW1lbnRLZXk6IG51bGwsXG4gICAgICAgIH0pO1xuICAgICAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbShTRUxFQ1RFRF9FTEVNRU5UX0tFWSwgbnVsbCk7XG5cbiAgICAgICAgdXBkYXRlT3V0bGluZXMocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgY3VycmVudFNlbGVjdGVkRWxlbWVudCA9IFRlbXBvRWxlbWVudC5mcm9tS2V5KFxuICAgICAgY3VycmVudFNlbGVjdGVkRWxlbWVudEtleSxcbiAgICApO1xuICAgIGNvbnN0IGN1cnJlbnRNdWx0aVNlbGVjdGVkS2V5czogc3RyaW5nW10gPVxuICAgICAgZ2V0TWVtb3J5U3RvcmFnZUl0ZW0oTVVMVElfU0VMRUNURURfRUxFTUVOVF9LRVlTKSB8fCBbXTtcblxuICAgIGxldCBuZXdTZWxlY3RlZEVsZW1lbnQgPVxuICAgICAgdHlwZW9mIHNlbGVjdGVkTmF2Tm9kZSA9PT0gJ3N0cmluZydcbiAgICAgICAgPyBUZW1wb0VsZW1lbnQuZm9yU3Rvcnlib2FyZChzdG9yeWJvYXJkSWQpXG4gICAgICAgIDogc2VsZWN0ZWROYXZOb2RlLnRlbXBvRWxlbWVudDtcbiAgICBsZXQgbmV3TXVsdGlTZWxlY3RLZXlzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgLy8gSWYgdGhlIHVzZXIgaXMgaG9sZGluZyBzaGlmdCwgY2hlY2sgaWYgd2UgY2FuIG11bHRpLXNlbGVjdCAoc29tZXRoaW5nIGhhcyB0byBiZSBhbHJlYWR5IHNlbGVjdGVkKVxuICAgIC8vIE5vdGU6IHRoaXMgbG9naWMgZ2VuZXJhbGx5IG1hdGNoZXMgdGhlIGxvZ2ljIGluIHRoZSBpZnJhbWUgc2xpY2Ugb24gdGVtcG8td2ViXG4gICAgaWYgKGUuc2hpZnRLZXkgJiYgY3VycmVudFNlbGVjdGVkRWxlbWVudEtleSkge1xuICAgICAgLy8gRmlyc3QgY2hlY2sgaWYgd2UgYXJlIGRlc2VsZWN0aW5nXG4gICAgICBjb25zdCBlbGVtZW50VG9EZXNlbGVjdCA9IGN1cnJlbnRNdWx0aVNlbGVjdGVkS2V5c1xuICAgICAgICAubWFwKChlbGVtZW50S2V5OiBzdHJpbmcpID0+IFRlbXBvRWxlbWVudC5mcm9tS2V5KGVsZW1lbnRLZXkpKVxuICAgICAgICAuZmluZCgoZWxlbWVudDogVGVtcG9FbGVtZW50KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIGVsZW1lbnQuaXNQYXJlbnRPZihuZXdTZWxlY3RlZEVsZW1lbnQpIHx8XG4gICAgICAgICAgICBlbGVtZW50LmlzRXF1YWwobmV3U2VsZWN0ZWRFbGVtZW50KVxuICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuXG4gICAgICBpZiAoZWxlbWVudFRvRGVzZWxlY3QpIHtcbiAgICAgICAgbmV3TXVsdGlTZWxlY3RLZXlzID0gY3VycmVudE11bHRpU2VsZWN0ZWRLZXlzLmZpbHRlcihcbiAgICAgICAgICAoZWxlbWVudEtleTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudEtleSAhPT0gZWxlbWVudFRvRGVzZWxlY3QuZ2V0S2V5KCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBQaWNrIGEgbmV3IGVsZW1lbnQgdG8gYmUgdGhlIG1haW4gc2VsZWN0ZWQgZWxlbWVudFxuICAgICAgICAvLyBOb3RlLCBpZiB0aGUgbGVuZ3RoIGlzIDEsIHRoZXJlIGlzIGxvZ2ljIGZ1cnRoZXIgZG93biB0byBoYW5kbGUgdGhhdCBjYXNlIGV4cGxpY2l0bHkgKHRvIGV4aXQgbXVsdGlzZWxlY3QgbW9kZSlcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGVsZW1lbnRUb0Rlc2VsZWN0LmlzRXF1YWwoY3VycmVudFNlbGVjdGVkRWxlbWVudCkgJiZcbiAgICAgICAgICBuZXdNdWx0aVNlbGVjdEtleXMubGVuZ3RoID4gMVxuICAgICAgICApIHtcbiAgICAgICAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIGlkOiBGSVhFRF9JRlJBTUVfTUVTU0FHRV9JRFMuU0VMRUNURURfRUxFTUVOVF9LRVksXG4gICAgICAgICAgICBlbGVtZW50S2V5OiBuZXdNdWx0aVNlbGVjdEtleXNbMF0sXG4gICAgICAgICAgICBvdXRlckhUTUw6ICQoYC4ke0VMRU1FTlRfS0VZX1BSRUZJWH0ke25ld011bHRpU2VsZWN0S2V5c1swXX1gKS5nZXQoXG4gICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICApPy5vdXRlckhUTUwsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgc2V0TWVtb3J5U3RvcmFnZUl0ZW0oU0VMRUNURURfRUxFTUVOVF9LRVksIG5ld011bHRpU2VsZWN0S2V5c1swXSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2hlY2sgaWYgd2UgY2FuIGFkZCB0aGlzIGVsZW1lbnRcbiAgICAgIH0gZWxzZSBpZiAoY3VycmVudFNlbGVjdGVkRWxlbWVudC5pc1NpYmxpbmdPZihuZXdTZWxlY3RlZEVsZW1lbnQpKSB7XG4gICAgICAgIGlmIChjdXJyZW50TXVsdGlTZWxlY3RlZEtleXM/Lmxlbmd0aCkge1xuICAgICAgICAgIG5ld011bHRpU2VsZWN0S2V5cyA9IGN1cnJlbnRNdWx0aVNlbGVjdGVkS2V5cy5jb25jYXQoW1xuICAgICAgICAgICAgbmV3U2VsZWN0ZWRFbGVtZW50LmdldEtleSgpLFxuICAgICAgICAgIF0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5ld011bHRpU2VsZWN0S2V5cyA9IFtcbiAgICAgICAgICAgIGN1cnJlbnRTZWxlY3RlZEVsZW1lbnRLZXksXG4gICAgICAgICAgICBuZXdTZWxlY3RlZEVsZW1lbnQuZ2V0S2V5KCksXG4gICAgICAgICAgXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhpcyBjYXNlIHRoZSB1c2VyIGlzIHRyeWluZyB0byBtdWx0aXNlbGVjdCBidXQgaXQncyBub3Qgc29tZXRoaW5nIHRoYXQncyBhbGxvd2VkLCBqdXN0IHJldHVybiBidXQgZG9uJ3QgbWFrZSBhbnkgY2hhbmdlc1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJbiBtdWx0aXNlbGVjdCBtb2RlLCBzZXQgdGhlIG5lY2Vzc2FyeSB2YWx1ZXNcbiAgICBpZiAobmV3TXVsdGlTZWxlY3RLZXlzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgICBpZDogRklYRURfSUZSQU1FX01FU1NBR0VfSURTLk1VTFRJX1NFTEVDVEVEX0VMRU1FTlRfS0VZUyxcbiAgICAgICAgZWxlbWVudEtleXM6IG5ld011bHRpU2VsZWN0S2V5cyxcbiAgICAgICAgb3V0ZXJIVE1MczogbmV3TXVsdGlTZWxlY3RLZXlzPy5tYXAoXG4gICAgICAgICAgKGVsZW1lbnRLZXkpID0+XG4gICAgICAgICAgICAkKGAuJHtFTEVNRU5UX0tFWV9QUkVGSVh9JHtlbGVtZW50S2V5fWApLmdldCgwKT8ub3V0ZXJIVE1MLFxuICAgICAgICApLFxuICAgICAgfSk7XG4gICAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbShNVUxUSV9TRUxFQ1RFRF9FTEVNRU5UX0tFWVMsIG5ld011bHRpU2VsZWN0S2V5cyk7XG4gICAgICB1cGRhdGVPdXRsaW5lcyhwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuXG4gICAgICB0ZWFyZG93bkVkaXRhYmxlVGV4dChwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICAgICAgcmV0dXJuIG51bGw7IC8vIENhbm5vdCBwZXJmb3JtIHJlZ3VsYXIgYWN0aW9ucyBvbiBhbnkgcGFydGljdWxhciBub2RlXG4gICAgfVxuXG4gICAgLy8gU3BlY2lhbCBjYXNlIC0gbXVsdGlzZWxlY3RpbmcgYnV0IGRlc2VsZWN0aW5nIGRvd24gdG8gMSwgc3RvcCB0aGUgbXVsdGlzZWxlY3QgbW9kZVxuICAgIGlmIChuZXdNdWx0aVNlbGVjdEtleXMubGVuZ3RoID09PSAxKSB7XG4gICAgICBuZXdTZWxlY3RlZEVsZW1lbnQgPSBUZW1wb0VsZW1lbnQuZnJvbUtleShuZXdNdWx0aVNlbGVjdEtleXNbMF0pO1xuICAgIH1cblxuICAgIGNvbnN0IGNsZWFyTXVsdGlTZWxlY3RTdGF0ZSA9ICgpID0+IHtcbiAgICAgIC8vIE5vdCBtdWx0aS1zZWxlY3RpbmcsIHNvIGNsZWFyIHRoZSBtdWx0aXNlbGVjdCBzdGF0ZVxuICAgICAgLy8gV2FudCB0byBkbyB0aGlzIGFmdGVyIHNldHRpbmcgdGhlIHNlbGVjdGVkIGVsZW1lbnQgdG8gcHJldmVudCBmbGFzaGluZ1xuICAgICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgIGlkOiBGSVhFRF9JRlJBTUVfTUVTU0FHRV9JRFMuTVVMVElfU0VMRUNURURfRUxFTUVOVF9LRVlTLFxuICAgICAgICBlbGVtZW50S2V5czogW10sXG4gICAgICAgIG91dGVySFRNTHM6IFtdLFxuICAgICAgfSk7XG4gICAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbShNVUxUSV9TRUxFQ1RFRF9FTEVNRU5UX0tFWVMsIG51bGwpO1xuICAgIH07XG5cbiAgICAvLyBTZWxlY3RpbmcgdGhlIHN0b3J5Ym9hcmQgZnJvbSB3aXRoaW5cbiAgICBpZiAobmV3U2VsZWN0ZWRFbGVtZW50LmlzU3Rvcnlib2FyZCgpKSB7XG4gICAgICBpZiAobmV3U2VsZWN0ZWRFbGVtZW50LmdldEtleSgpICE9PSBjdXJyZW50U2VsZWN0ZWRFbGVtZW50S2V5KSB7XG4gICAgICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgIGlkOiBGSVhFRF9JRlJBTUVfTUVTU0FHRV9JRFMuU0VMRUNURURfRUxFTUVOVF9LRVksXG4gICAgICAgICAgZWxlbWVudEtleTogbmV3U2VsZWN0ZWRFbGVtZW50LmdldEtleSgpLFxuICAgICAgICAgIG91dGVySFRNTDogJChcbiAgICAgICAgICAgIGAuJHtFTEVNRU5UX0tFWV9QUkVGSVh9JHtuZXdTZWxlY3RlZEVsZW1lbnQuZ2V0S2V5KCl9YCxcbiAgICAgICAgICApLmdldCgwKT8ub3V0ZXJIVE1MLFxuICAgICAgICB9KTtcbiAgICAgICAgc2V0TWVtb3J5U3RvcmFnZUl0ZW0oU0VMRUNURURfRUxFTUVOVF9LRVksIG5ld1NlbGVjdGVkRWxlbWVudC5nZXRLZXkoKSk7XG5cbiAgICAgICAgdXBkYXRlT3V0bGluZXMocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgICAgIH1cblxuICAgICAgdGVhcmRvd25FZGl0YWJsZVRleHQocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgICAgIGNsZWFyTXVsdGlTZWxlY3RTdGF0ZSgpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKGN1cnJlbnRseUVkaXRpbmcoKSkge1xuICAgICAgY29uc3QgZWRpdGluZ0luZm8gPSBnZXRFZGl0aW5nSW5mbygpO1xuXG4gICAgICBpZiAoZWRpdGluZ0luZm8/LmtleSAhPT0gY3VycmVudFNlbGVjdGVkRWxlbWVudEtleSkge1xuICAgICAgICB0ZWFyZG93bkVkaXRhYmxlVGV4dChwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICAgICAgfVxuXG4gICAgICBjbGVhck11bHRpU2VsZWN0U3RhdGUoKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgaWYgKFxuICAgICAgY2FuRWRpdFRleHQobmV3U2VsZWN0ZWRFbGVtZW50KSAmJlxuICAgICAgbmV3U2VsZWN0ZWRFbGVtZW50LmdldEtleSgpID09PSBjdXJyZW50U2VsZWN0ZWRFbGVtZW50S2V5XG4gICAgKSB7XG4gICAgICBzZXR1cEVkaXRhYmxlVGV4dChuZXdTZWxlY3RlZEVsZW1lbnQsIHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgfVxuXG4gICAgaWYgKG5ld1NlbGVjdGVkRWxlbWVudC5nZXRLZXkoKSA9PT0gY3VycmVudFNlbGVjdGVkRWxlbWVudEtleSkge1xuICAgICAgY2xlYXJNdWx0aVNlbGVjdFN0YXRlKCk7XG4gICAgICByZXR1cm4gc2VsZWN0ZWROYXZOb2RlIGFzIE5hdlRyZWVOb2RlO1xuICAgIH1cblxuICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgaWQ6IEZJWEVEX0lGUkFNRV9NRVNTQUdFX0lEUy5TRUxFQ1RFRF9FTEVNRU5UX0tFWSxcbiAgICAgIGVsZW1lbnRLZXk6IG5ld1NlbGVjdGVkRWxlbWVudC5nZXRLZXkoKSxcbiAgICAgIG91dGVySFRNTDogJChgLiR7RUxFTUVOVF9LRVlfUFJFRklYfSR7bmV3U2VsZWN0ZWRFbGVtZW50LmdldEtleSgpfWApLmdldChcbiAgICAgICAgMCxcbiAgICAgICk/Lm91dGVySFRNTCxcbiAgICB9KTtcbiAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbShTRUxFQ1RFRF9FTEVNRU5UX0tFWSwgbmV3U2VsZWN0ZWRFbGVtZW50LmdldEtleSgpKTtcbiAgICB1cGRhdGVPdXRsaW5lcyhwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICAgIGNsZWFyTXVsdGlTZWxlY3RTdGF0ZSgpO1xuICAgIHJldHVybiBzZWxlY3RlZE5hdk5vZGUgYXMgTmF2VHJlZU5vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgaWYgZXZlbnRzIHdlcmUgcGFzc2VkIHRocm91Z2hcbiAgICovXG4gIGNvbnN0IHBhc3NUaHJvdWdoRXZlbnRzSWZOZWVkZWQgPSAoXG4gICAgZTogYW55LFxuICAgIHBhcmVudFBvcnQ6IGFueSxcbiAgICBzdG9yeWJvYXJkSWQ6IHN0cmluZyxcbiAgKTogYm9vbGVhbiA9PiB7XG4gICAgY29uc3QgZHJpdmVNb2RlRW5hYmxlZCA9ICEhZ2V0U2Vzc2lvblN0b3JhZ2VJdGVtKFxuICAgICAgJ2RyaXZlTW9kZUVuYWJsZWQnLFxuICAgICAgc3Rvcnlib2FyZElkLFxuICAgICk7XG4gICAgY29uc3QgZWRpdGluZ1RleHRJbmZvID0gZ2V0RWRpdGluZ0luZm8oKTtcblxuICAgIGlmIChkcml2ZU1vZGVFbmFibGVkIHx8IGVkaXRpbmdUZXh0SW5mbykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgZT8ucHJldmVudERlZmF1bHQ/LigpO1xuICAgIGU/LnN0b3BQcm9wYWdhdGlvbj8uKCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIGNvbnN0IG9uQ2xpY2tFbGVtZW50Q29udGV4dE1lbnUgPSAoXG4gICAgZTogYW55LFxuICAgIHBhcmVudFBvcnQ6IGFueSxcbiAgICBzdG9yeWJvYXJkSWQ6IHN0cmluZyxcbiAgKSA9PiB7XG4gICAgY29uc3QgcGFzc2VkVGhyb3VnaCA9IHBhc3NUaHJvdWdoRXZlbnRzSWZOZWVkZWQoXG4gICAgICBlLFxuICAgICAgcGFyZW50UG9ydCxcbiAgICAgIHN0b3J5Ym9hcmRJZCxcbiAgICApO1xuICAgIGlmIChwYXNzZWRUaHJvdWdoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAvLyBNb3VzZSBkb3duIGlzIGNhbGxlZCB3aGVuIGEgdXNlciBjbGlja3MgdGhlIGNvbnRleHQgbWVudSwgYnV0IG5vdCBtb3VzZSB1cCwgc28gY2xlYXIgdGhlIG1vdXNlIGRvd25cbiAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbSgnbW91c2VEcmFnQ29udGV4dCcsIG51bGwpO1xuXG4gICAgY29uc3QgZWxlbWVudEtleVRvTmF2Tm9kZSA9XG4gICAgICBnZXRNZW1vcnlTdG9yYWdlSXRlbShFTEVNRU5UX0tFWV9UT19OQVZfTk9ERSkgfHwge307XG5cbiAgICBsZXQgcmVxdWVzdGVkTmF2Tm9kZTogTmF2VHJlZU5vZGUgfCBudWxsIHwgc3RyaW5nO1xuICAgIGlmIChlLm1ldGFLZXkgfHwgZS5jdHJsS2V5KSB7XG4gICAgICBjb25zdCBlbGVtZW50S2V5OiBhbnkgPSBnZXRFbGVtZW50S2V5RnJvbU5vZGUoZS50YXJnZXQpO1xuICAgICAgcmVxdWVzdGVkTmF2Tm9kZSA9IGVsZW1lbnRLZXlUb05hdk5vZGVbZWxlbWVudEtleV07XG5cbiAgICAgIC8vIFNwZWNpYWwgY2FzZSAtPiB0aGlzIGlzIHRoZSB0b3AtbW9zdCBub2RlIHNvIGl0IHNob3VsZCB0cmlnZ2VyIGEgY29udGV4dCBtZW51IG9uIHRoZSBzdG9yeWJvYXJkXG4gICAgICBpZiAoIXJlcXVlc3RlZE5hdk5vZGUgJiYgZS50YXJnZXQucGFyZW50Tm9kZSA9PT0gZG9jdW1lbnQuYm9keSkge1xuICAgICAgICByZXF1ZXN0ZWROYXZOb2RlID0gU0VMRUNUX09SX0hPVkVSX1NUT1JZQk9BUkQ7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcXVlc3RlZE5hdk5vZGUgPSBnZXRTZWxlY3RhYmxlTmF2Tm9kZShlKTtcbiAgICB9XG5cbiAgICBjb25zdCBjdXJyZW50U2VsZWN0ZWRFbGVtZW50S2V5ID1cbiAgICAgIGdldE1lbW9yeVN0b3JhZ2VJdGVtKFNFTEVDVEVEX0VMRU1FTlRfS0VZKTtcbiAgICBjb25zdCBjdXJyZW50TXVsdGlTZWxlY3RlZEtleXMgPSBnZXRNZW1vcnlTdG9yYWdlSXRlbShcbiAgICAgIE1VTFRJX1NFTEVDVEVEX0VMRU1FTlRfS0VZUyxcbiAgICApO1xuXG4gICAgaWYgKCFyZXF1ZXN0ZWROYXZOb2RlIHx8IHR5cGVvZiByZXF1ZXN0ZWROYXZOb2RlID09PSAnc3RyaW5nJykge1xuICAgICAgaWYgKFxuICAgICAgICByZXF1ZXN0ZWROYXZOb2RlID09PSBTRUxFQ1RfT1JfSE9WRVJfU1RPUllCT0FSRCAmJlxuICAgICAgICAhY3VycmVudE11bHRpU2VsZWN0ZWRLZXlzPy5sZW5ndGhcbiAgICAgICkge1xuICAgICAgICBjb25zdCBzdG9yeWJvYXJkS2V5ID0gVGVtcG9FbGVtZW50LmZvclN0b3J5Ym9hcmQoc3Rvcnlib2FyZElkKS5nZXRLZXkoKTtcblxuICAgICAgICBpZiAoY3VycmVudFNlbGVjdGVkRWxlbWVudEtleSA9PT0gc3Rvcnlib2FyZEtleSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgIGlkOiBGSVhFRF9JRlJBTUVfTUVTU0FHRV9JRFMuU0VMRUNURURfRUxFTUVOVF9LRVksXG4gICAgICAgICAgZWxlbWVudEtleTogc3Rvcnlib2FyZEtleSxcbiAgICAgICAgfSk7XG4gICAgICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKFNFTEVDVEVEX0VMRU1FTlRfS0VZLCBzdG9yeWJvYXJkS2V5KTtcblxuICAgICAgICB1cGRhdGVPdXRsaW5lcyhwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBjb250ZXh0UmVxdWVzdGVkRWxlbWVudEtleTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgICBjb25zdCBzZWxlY3RlZEVsZW1lbnRLZXkgPSBnZXRNZW1vcnlTdG9yYWdlSXRlbShTRUxFQ1RFRF9FTEVNRU5UX0tFWSk7XG4gICAgY29uc3Qgc2VsZWN0ZWRFbGVtZW50ID0gVGVtcG9FbGVtZW50LmZyb21LZXkoc2VsZWN0ZWRFbGVtZW50S2V5KTtcblxuICAgIC8vIERvbid0IHNlbGVjdCBhbnkgY2hpbGRyZW4gYXMgdGhlIHVzZXIgbWlnaHQgYmUgcmlnaHQgY2xpY2tpbmcgYSBub2RlIHRoZXkgc2VsZWN0ZWRcbiAgICBpZiAoXG4gICAgICAhcmVxdWVzdGVkTmF2Tm9kZS50ZW1wb0VsZW1lbnQuaXNFcXVhbChzZWxlY3RlZEVsZW1lbnQpICYmXG4gICAgICAhc2VsZWN0ZWRFbGVtZW50LmlzUGFyZW50T2YocmVxdWVzdGVkTmF2Tm9kZS50ZW1wb0VsZW1lbnQpICYmXG4gICAgICAhY3VycmVudE11bHRpU2VsZWN0ZWRLZXlzPy5sZW5ndGggLy8gQWxzbyBkb24ndCBzZWxlY3QgYW55dGhpbmcgbmV3IGlmIGluIG11bHRpc2VsZWN0IG1vZGVcbiAgICApIHtcbiAgICAgIGNvbnRleHRSZXF1ZXN0ZWRFbGVtZW50S2V5ID0gcmVxdWVzdGVkTmF2Tm9kZS50ZW1wb0VsZW1lbnQuZ2V0S2V5KCk7XG5cbiAgICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgICBpZDogRklYRURfSUZSQU1FX01FU1NBR0VfSURTLlNFTEVDVEVEX0VMRU1FTlRfS0VZLFxuICAgICAgICBlbGVtZW50S2V5OiBjb250ZXh0UmVxdWVzdGVkRWxlbWVudEtleSxcbiAgICAgICAgb3V0ZXJIVE1MOiAkKGAuJHtFTEVNRU5UX0tFWV9QUkVGSVh9JHtjb250ZXh0UmVxdWVzdGVkRWxlbWVudEtleX1gKS5nZXQoXG4gICAgICAgICAgMCxcbiAgICAgICAgKT8ub3V0ZXJIVE1MLFxuICAgICAgfSk7XG4gICAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbShTRUxFQ1RFRF9FTEVNRU5UX0tFWSwgY29udGV4dFJlcXVlc3RlZEVsZW1lbnRLZXkpO1xuICAgICAgdXBkYXRlT3V0bGluZXMocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRhbnRGaWVsZHMgPSB7XG4gICAgICBjbGllbnRYOiBlLmNsaWVudFgsXG4gICAgICBjbGllbnRZOiBlLmNsaWVudFksXG4gICAgfTtcblxuICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgaWQ6IEZJWEVEX0lGUkFNRV9NRVNTQUdFX0lEUy5DT05URVhUX1JFUVVFU1RFRCxcbiAgICAgIGV2ZW50OiBpbXBvcnRhbnRGaWVsZHMsXG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgYnVpbGRBbmRTZW5kTmF2VHJlZSA9IChcbiAgICBwYXJlbnRQb3J0OiBhbnksXG4gICAgc3Rvcnlib2FyZElkOiBzdHJpbmcsXG4gICAgdHJlZUVsZW1lbnRMb29rdXA/OiBhbnksXG4gICAgc2NvcGVMb29rdXA/OiBhbnksXG4gICAgc3Rvcnlib2FyZENvbXBvbmVudEVsZW1lbnQ/OiBhbnksXG4gICkgPT4ge1xuICAgIGxldCB0cmVlRWxlbWVudHMgPSB0cmVlRWxlbWVudExvb2t1cDtcbiAgICBpZiAoIXRyZWVFbGVtZW50cykge1xuICAgICAgdHJlZUVsZW1lbnRzID0gZ2V0TWVtb3J5U3RvcmFnZUl0ZW0oVFJFRV9FTEVNRU5UX0xPT0tVUCkgfHwge307XG4gICAgfVxuXG4gICAgbGV0IHNjb3BlcyA9IHNjb3BlTG9va3VwO1xuICAgIGlmICghc2NvcGVzKSB7XG4gICAgICBzY29wZXMgPSBnZXRNZW1vcnlTdG9yYWdlSXRlbShTQ09QRV9MT09LVVApIHx8IHt9O1xuICAgIH1cblxuICAgIGxldCBzdG9yeWJvYXJkQ29tcG9uZW50ID0gc3Rvcnlib2FyZENvbXBvbmVudEVsZW1lbnQ7XG4gICAgaWYgKHN0b3J5Ym9hcmRDb21wb25lbnRFbGVtZW50ID09PSAnRVhQTElDSVRfTk9ORScpIHtcbiAgICAgIHN0b3J5Ym9hcmRDb21wb25lbnQgPSBudWxsO1xuICAgIH0gZWxzZSBpZiAoIXN0b3J5Ym9hcmRDb21wb25lbnQpIHtcbiAgICAgIHN0b3J5Ym9hcmRDb21wb25lbnQgPSBnZXRNZW1vcnlTdG9yYWdlSXRlbShTVE9SWUJPQVJEX0NPTVBPTkVOVCkgfHwge307XG4gICAgfVxuXG4gICAgY29uc3Qgcm9vdFJlYWN0RWxlbWVudCA9IGdldFJvb3RSZWFjdEVsZW1lbnQoKTtcblxuICAgIGNvbnN0IHJlYWN0VHJlZSA9IGJ1aWxkTm9kZVRyZWUocm9vdFJlYWN0RWxlbWVudCwgbnVsbCk7XG4gICAgY29uc3QgbG9va3VwSWRUb1JlYWN0VHJlZU1hcCA9IHt9O1xuICAgIGJ1aWxkVHJlZUxvb2t1cE1hcChyZWFjdFRyZWUsIGxvb2t1cElkVG9SZWFjdFRyZWVNYXApO1xuXG4gICAgY29uc3Qga25vd25Db21wb25lbnROYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGtub3duQ29tcG9uZW50SW5zdGFuY2VOYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gICAgaWYgKHRyZWVFbGVtZW50cykge1xuICAgICAgT2JqZWN0LnZhbHVlcyh0cmVlRWxlbWVudHMpLmZvckVhY2goKHRyZWVFbGVtZW50OiBhbnkpID0+IHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRyZWVFbGVtZW50LnR5cGUgPT09ICdjb21wb25lbnQnIHx8XG4gICAgICAgICAgdHJlZUVsZW1lbnQudHlwZSA9PT0gJ3N0b3J5Ym9vay1jb21wb25lbnQnXG4gICAgICAgICkge1xuICAgICAgICAgIGtub3duQ29tcG9uZW50TmFtZXMuYWRkKHRyZWVFbGVtZW50LmNvbXBvbmVudE5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRyZWVFbGVtZW50LnR5cGUgPT09ICdjb21wb25lbnQtaW5zdGFuY2UnKSB7XG4gICAgICAgICAga25vd25Db21wb25lbnRJbnN0YW5jZU5hbWVzLmFkZCh0cmVlRWxlbWVudC5jb21wb25lbnROYW1lKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgZWxlbWVudEtleVRvTG9va3VwTGlzdCA9IHt9O1xuICAgIGNvbnN0IGVsZW1lbnRLZXlUb05hdk5vZGUgPSB7fTtcblxuICAgIGNvbnN0IGJ1aWx0TmF2VHJlZSA9IGJ1aWxkTmF2Rm9yTm9kZShcbiAgICAgIHN0b3J5Ym9hcmRJZCxcbiAgICAgIHVuZGVmaW5lZCxcbiAgICAgICQoJ2JvZHknKS5nZXQoMCksXG4gICAgICAnJyxcbiAgICAgICdyb290JyxcbiAgICAgIHNjb3BlcyxcbiAgICAgIHRyZWVFbGVtZW50cyxcbiAgICAgIGxvb2t1cElkVG9SZWFjdFRyZWVNYXAsXG4gICAgICBrbm93bkNvbXBvbmVudE5hbWVzLFxuICAgICAga25vd25Db21wb25lbnRJbnN0YW5jZU5hbWVzLFxuICAgICAgZWxlbWVudEtleVRvTG9va3VwTGlzdCxcbiAgICAgIGVsZW1lbnRLZXlUb05hdk5vZGUsXG4gICAgKTtcblxuICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKEVMRU1FTlRfS0VZX1RPX0xPT0tVUF9MSVNULCBlbGVtZW50S2V5VG9Mb29rdXBMaXN0KTtcblxuICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKENVUlJFTlRfTkFWX1RSRUUsIGJ1aWx0TmF2VHJlZSk7XG5cbiAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbShFTEVNRU5UX0tFWV9UT19OQVZfTk9ERSwgZWxlbWVudEtleVRvTmF2Tm9kZSk7XG5cbiAgICBjbGVhckxvb2t1cHNGcm9tVHJlZShyZWFjdFRyZWUpO1xuXG4gICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICBpZDogRklYRURfSUZSQU1FX01FU1NBR0VfSURTLk5BVl9UUkVFLFxuICAgICAgbmF2VHJlZTogYnVpbHROYXZUcmVlLFxuICAgICAgb3V0ZXJIdG1sOiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQub3V0ZXJIVE1MLFxuICAgIH0pO1xuXG4gICAgLy8gUnVuIGNhbGxiYWNrc1xuICAgIHJ1bk5hdlRyZWVCdWlsdENhbGxiYWNrcygpO1xuICB9O1xuXG4gIGNvbnN0IG9uRmx1c2hTdGFydCA9ICgpID0+IHtcbiAgICAvLyBGaW5kIGFsbCBpbnN0YW50IHVwZGF0ZSBzdHlsaW5nIGNsYXNzZXMgdG8gZGVsZXRlXG4gICAgY29uc3QgY2xhc3Nlc1RvRGVsZXRlOiBzdHJpbmdbXSA9IFtdO1xuICAgICQoYCpbY2xhc3MqPSR7VEVNUE9fSU5TVEFOVF9VUERBVEVfU1RZTElOR19QUkVGSVh9XWApLmVhY2goKGksIGVsZW1lbnQpID0+IHtcbiAgICAgIGNvbnN0IGNsYXNzZXMgPSAoZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2NsYXNzJykgfHwgJycpLnNwbGl0KCcgJyk7XG4gICAgICBjbGFzc2VzLmZvckVhY2goKGNsYXNzTmFtZSkgPT4ge1xuICAgICAgICBpZiAoY2xhc3NOYW1lLnN0YXJ0c1dpdGgoVEVNUE9fSU5TVEFOVF9VUERBVEVfU1RZTElOR19QUkVGSVgpKSB7XG4gICAgICAgICAgY2xhc3Nlc1RvRGVsZXRlLnB1c2goY2xhc3NOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAkKGAqWyR7VEVNUE9fREVMRVRFX0FGVEVSX1JFRlJFU0h9PXRydWVdYCkuYXR0cihcbiAgICAgIFRFTVBPX1FVRVVFX0RFTEVURV9BRlRFUl9IT1RfUkVMT0FELFxuICAgICAgJ3RydWUnLFxuICAgICk7XG5cbiAgICAvLyBDbGVhciB0aGUgYWRkIGNsYXNzIGluc3RhbnQgdXBkYXRlIHF1ZXVlIGFzIHRob3NlIGl0ZW1zIHdpbGwgYmUgYXBwbGllZCBpbiB0aGUgaG90IHJlbG9hZFxuICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKEFERF9DTEFTU19JTlNUQU5UX1VQREFURV9RVUVVRSwgW10pO1xuXG4gICAgc2V0TWVtb3J5U3RvcmFnZUl0ZW0oJ1BPU1RfSE9UX1JFTE9BRF9DTEVBUicsIHtcbiAgICAgIGNsYXNzZXNUb0RlbGV0ZSxcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBjbGVhckluc3RhbnRVcGRhdGVzQW5kU2VuZE5hdlRyZWUgPSAoXG4gICAgcGFyZW50UG9ydDogYW55LFxuICAgIHN0b3J5Ym9hcmRJZDogc3RyaW5nLFxuICApID0+IHtcbiAgICBnbG9iYWxVSVVwZGF0ZVJ1bm5lcigoKSA9PiB7XG4gICAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbShMQVNUX05BVl9UUkVFX1JFRlJFU0hfVElNRSwgbmV3IERhdGUoKSk7XG5cbiAgICAgIGNvbnN0IHsgY2xhc3Nlc1RvRGVsZXRlIH0gPVxuICAgICAgICBnZXRNZW1vcnlTdG9yYWdlSXRlbSgnUE9TVF9IT1RfUkVMT0FEX0NMRUFSJykgfHwge307XG5cbiAgICAgIC8vIERlbGV0ZSBhbGwgaW5zdGFudCB1cGRhdGUgY2hhbmdlZCBlbGVtZW50c1xuICAgICAgJChgKlske1RFTVBPX1FVRVVFX0RFTEVURV9BRlRFUl9IT1RfUkVMT0FEfT10cnVlXWApLnJlbW92ZSgpO1xuXG4gICAgICAvLyBDbGVhciB0aGUgYWRkZWQgZGlzcGxheSBub25lc1xuICAgICAgJChgLiR7VEVNUE9fRElTUExBWV9OT05FX1VOVElMX1JFRlJFU0hfQ0xBU1N9YCkucmVtb3ZlQ2xhc3MoXG4gICAgICAgIFRFTVBPX0RJU1BMQVlfTk9ORV9VTlRJTF9SRUZSRVNIX0NMQVNTLFxuICAgICAgKTtcbiAgICAgICQoYCpbJHtURU1QT19JTlNUQU5UX1VQREFURX09dHJ1ZV1gKS5yZW1vdmVBdHRyKFRFTVBPX0lOU1RBTlRfVVBEQVRFKTtcbiAgICAgICQoYCpbJHtURU1QT19ET19OT1RfU0hPV19JTl9OQVZfVU5USUxfUkVGUkVTSH09dHJ1ZV1gKS5yZW1vdmVBdHRyKFxuICAgICAgICBURU1QT19ET19OT1RfU0hPV19JTl9OQVZfVU5USUxfUkVGUkVTSCxcbiAgICAgICk7XG5cbiAgICAgICQoYC4ke1RFTVBPUkFSWV9TVFlMSU5HX0NMQVNTX05BTUV9YCkucmVtb3ZlQ2xhc3MoXG4gICAgICAgIFRFTVBPUkFSWV9TVFlMSU5HX0NMQVNTX05BTUUsXG4gICAgICApO1xuXG4gICAgICAvLyBBbnkgY2xhc3NlcyBtYXJrZWQgdG8gZGVsZXRlIGJlZm9yZSB0aGUgaG90IHJlbG9hZFxuICAgICAgY2xhc3Nlc1RvRGVsZXRlPy5mb3JFYWNoKChjbHM6IHN0cmluZykgPT4ge1xuICAgICAgICAkKGAuJHtjbHN9YCkucmVtb3ZlQ2xhc3MoY2xzKTtcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBuZXdBZGRDbGFzc1F1ZXVlID1cbiAgICAgICAgZ2V0TWVtb3J5U3RvcmFnZUl0ZW0oQUREX0NMQVNTX0lOU1RBTlRfVVBEQVRFX1FVRVVFKSB8fCBbXTtcblxuICAgICAgLy8gQW55IGF0dHJpYnV0ZXMgdGhhdCBzdGFydCB3aXRoIHRoZSBzdHlsaW5nIHByZWZpeCBsZWZ0b3ZlciBtZWFuIHRoYXQgdGhlIGNsYXNzIG5lZWRzIHRvIGJlIHJlLWFwcGxpZWRcbiAgICAgIC8vIHRoZXNlIGFyZSBjbGFzc2VzIHRoYXQgd2VyZSBhZGRlZCBpbiBpbnN0YW50IHVwZGF0ZXMgd2hpbGUgdGhlIGhvdCByZWxvYWQgd2FzIGluIHByb2dyZXNzXG4gICAgICBuZXdBZGRDbGFzc1F1ZXVlLmZvckVhY2goKGl0ZW06IGFueSkgPT4ge1xuICAgICAgICBpZiAoIWl0ZW0pIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IGNvZGViYXNlSWQsIGNsYXNzTmFtZSB9ID0gaXRlbTtcbiAgICAgICAgaWYgKGNvZGViYXNlSWQgJiYgY2xhc3NOYW1lKSB7XG4gICAgICAgICAgJChgLiR7Y29kZWJhc2VJZH1gKS5hdHRyKFRFTVBPX0lOU1RBTlRfVVBEQVRFLCAndHJ1ZScpO1xuXG4gICAgICAgICAgJChgLiR7Y29kZWJhc2VJZH1gKS5hZGRDbGFzcyhjbGFzc05hbWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8vIFJlYnVpbGQgdGhlIG5hdiB0cmVlIG9uIERPTSBjaGFuZ2VkIGFmdGVyIHNvbWUgdGltZSBoYXMgcGFzc2VkXG4gICAgLy8gdGhpcyBnaXZlcyB0aGUgcmVhY3QgZmliZXIgdGltZSB0byBiZSBmdWxseSByZWNvbmNpbGVkXG4gICAgdHJ5IHtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBnbG9iYWxVSVVwZGF0ZVJ1bm5lcigoKSA9PiB7XG4gICAgICAgICAgYnVpbGRBbmRTZW5kTmF2VHJlZShwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICAgICAgICAgIHVwZGF0ZU91dGxpbmVzKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgICAgIH0pO1xuICAgICAgfSwgMzAwKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdFUlJPUjogQ291bGQgbm90IHJlLWNyZWF0ZSBuYXYgdHJlZSBvbiBET00gY2hhbmdlLCAnICsgZSk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IG9uRE9NQ2hhbmdlZCA9ICh7XG4gICAgbXV0YXRpb25zLFxuICAgIHBhcmVudFBvcnQsXG4gICAgc3Rvcnlib2FyZElkLFxuICAgIGZyb21OZXh0SnNMb2FkZXIsXG4gIH06IHtcbiAgICBtdXRhdGlvbnM6IGFueVtdO1xuICAgIHBhcmVudFBvcnQ6IGFueTtcbiAgICBzdG9yeWJvYXJkSWQ6IHN0cmluZztcblxuICAgIC8vIElmIHNldCB0byB0cnVlIHRoaXMgaXMgY2FsbGVkIGZyb20gdGhlIHNoYWRvdyByb290IGZvciB0aGUgbmV4dGpzIGJ1aWxkIHdhdGNoZXIgKHRoZSBzcGlubmluZyB0cmlhbmdsZSlcbiAgICBmcm9tTmV4dEpzTG9hZGVyPzogYm9vbGVhbjtcbiAgfSkgPT4ge1xuICAgIC8vIFVkcGF0ZSB0aGUgaHJlZiBpbiB0aGUgcGFyZW50IGNvbnRhaW5lclxuICAgIGlmIChnZXRNZW1vcnlTdG9yYWdlSXRlbSgnaHJlZicpICE9PSB3aW5kb3cubG9jYXRpb24uaHJlZikge1xuICAgICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgIGlkOiBGSVhFRF9JRlJBTUVfTUVTU0FHRV9JRFMuTEFURVNUX0hSRUYsXG4gICAgICAgIGhyZWY6IHdpbmRvdy5sb2NhdGlvbi5ocmVmLFxuICAgICAgfSk7XG4gICAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbSgnaHJlZicsIHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiB3ZSBzaG91bGQgcmVmcmVzaCB0aGUgbmF2IHRyZWVcbiAgICBsZXQgcmVmcmVzaE5hdlRyZWUgPSBmYWxzZTtcbiAgICBpZiAoZnJvbU5leHRKc0xvYWRlcikge1xuICAgICAgLy8gRnJvbSB0aGUgbmV4dGpzIGxvYWRlciwgcmVmcmVzaCB3aGVuIHRoZSBsb2FkZXIgZ2V0cyBoaWRkZW4gKG1lYW5zIHJlZnJlc2ggaXMgZG9uZSlcbiAgICAgIGNvbnN0IG11dGF0aW9uVGFyZ2V0ID0gbXV0YXRpb25zPy5bMF0/LnRhcmdldDtcbiAgICAgIGlmIChtdXRhdGlvblRhcmdldCAmJiBtdXRhdGlvblRhcmdldC5pZCA9PT0gJ2NvbnRhaW5lcicpIHtcbiAgICAgICAgY29uc3QgY3VycmVudGx5SG90UmVsb2FkaW5nID0gZ2V0TWVtb3J5U3RvcmFnZUl0ZW0oSE9UX1JFTE9BRElORyk7XG5cbiAgICAgICAgaWYgKG11dGF0aW9uVGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygndmlzaWJsZScpKSB7XG4gICAgICAgICAgc2V0TWVtb3J5U3RvcmFnZUl0ZW0oSE9UX1JFTE9BRElORywgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2V0TWVtb3J5U3RvcmFnZUl0ZW0oSE9UX1JFTE9BRElORywgZmFsc2UpO1xuICAgICAgICAgIHJlZnJlc2hOYXZUcmVlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBtdXRhdGlvbnMuZm9yRWFjaCgoZTogYW55KSA9PiB7XG4gICAgICAgIGlmIChyZWZyZXNoTmF2VHJlZSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZSBjbGFzcyBhdHRyaWJ1dGUgaGFzIGNoYW5nZWQgb24gYW4gZWxlbWVudCB3ZSBoYXZlIHRvIHJlcGFyc2UgdGhlIG5hdiB0cmVlIHRvIGFkZCB0aGUgZWxlbWVudCBrZXlcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGUudHlwZSA9PT0gJ2F0dHJpYnV0ZXMnICYmXG4gICAgICAgICAgZS5hdHRyaWJ1dGVOYW1lID09PSAnY2xhc3MnICYmXG4gICAgICAgICAgZS50YXJnZXQgJiZcbiAgICAgICAgICAhaXNOb2RlT3V0bGluZShlLnRhcmdldCkgJiZcbiAgICAgICAgICAhaXNNb3ZpbmdFbGVtZW50KGUudGFyZ2V0KSAmJlxuICAgICAgICAgIC8vIEFuZCBub3QgYSBzY3JpcHRcbiAgICAgICAgICAvLyBCdWcgZm91bmQgb24gT2N0IDgsIDIwMjQsIGZvciBzb21lIHJlYXNvbiB0aGUgc2NyaXB0IGtlcHQgdHJpZ2dlcmluZyBhIHJlbG9hZFxuICAgICAgICAgICFlLnRhcmdldC50YWdOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3NjcmlwdCcpXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnN0IGVsZW1lbnRLZXkgPSBnZXRFbGVtZW50S2V5RnJvbU5vZGUoZS50YXJnZXQpO1xuICAgICAgICAgIGNvbnN0IHVuaXF1ZUxvb2t1cCA9IGdldFVuaXF1ZUxvb2t1cEZyb21Ob2RlKGUudGFyZ2V0KTtcbiAgICAgICAgICAvLyBBbiBlbGVtZW50IHdoaWNoIGRvZXNuJ3QgaGF2ZSBhbiBlbGVtZW50IGtleSBoYXMgY2hhbmdlZFxuICAgICAgICAgIGlmICghZWxlbWVudEtleSAmJiAhdW5pcXVlTG9va3VwICYmICFpc0VsZW1lbnRJblN2ZyhlLnRhcmdldCkpIHtcbiAgICAgICAgICAgIHJlZnJlc2hOYXZUcmVlID0gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBbZS5hZGRlZE5vZGVzLCBlLnJlbW92ZWROb2Rlc10uZm9yRWFjaCgobm9kZUxpc3QpID0+IHtcbiAgICAgICAgICBpZiAocmVmcmVzaE5hdlRyZWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIW5vZGVMaXN0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbm9kZUxpc3QuZm9yRWFjaCgobm9kZTogYW55KSA9PiB7XG4gICAgICAgICAgICBpZiAoIWlzTm9kZU91dGxpbmUobm9kZSkgJiYgIWlzTW92aW5nRWxlbWVudChub2RlKSkge1xuICAgICAgICAgICAgICByZWZyZXNoTmF2VHJlZSA9IHRydWU7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoIXJlZnJlc2hOYXZUcmVlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSW4gdGhlc2UgY2FzZXMgd2UgZG9uJ3Qgd2FudCB0byB0cmlnZ2VyIGEgbmF2IHRyZWUgcmVmcmVzaCByaWdodCBhd2F5XG4gICAgLy8gc2luY2UgdGhlIGhvdCByZWxvYWQgbWF5IG5vdCBoYXZlIGhhcHBlbmVkIHlldC4gU28gd2Ugc2V0IGEgdGltZW91dCBhbmQgb25seVxuICAgIC8vIHRyaWdnZXIgYSBuYXYgdHJlZSByZWZyZXNoIGlmIGFub3RoZXIgb25lIGhhc24ndCBoYXBwZW5lZCBpbiBiZXR3ZWVuXG4gICAgaWYgKGZyb21OZXh0SnNMb2FkZXIpIHtcbiAgICAgIGNvbnN0IHRyaWdnZXJUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBjb25zdCBsYXN0UmVmcmVzaFRpbWUgPSBnZXRNZW1vcnlTdG9yYWdlSXRlbShcbiAgICAgICAgICBMQVNUX05BVl9UUkVFX1JFRlJFU0hfVElNRSxcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBEb24ndCByZS1jbGVhciBhbmQgc2VuZCBpZiBhbm90aGVyIHJlZnJlc2ggaGFzIGhhcHBlbmVkIGluIHRoZSBtZWFudGltZVxuICAgICAgICBpZiAoIWxhc3RSZWZyZXNoVGltZSB8fCBsYXN0UmVmcmVzaFRpbWUgPCB0cmlnZ2VyVGltZSkge1xuICAgICAgICAgIGNsZWFySW5zdGFudFVwZGF0ZXNBbmRTZW5kTmF2VHJlZShwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICAgICAgICB9XG4gICAgICB9LCAxMDAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjbGVhckluc3RhbnRVcGRhdGVzQW5kU2VuZE5hdlRyZWUocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgfTtcblxuICBjb25zdCBvbldoZWVsID0gKGU6IGFueSwgcGFyZW50UG9ydDogYW55LCBzdG9yeWJvYXJkSWQ6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHBhc3NlZFRocm91Z2ggPSBwYXNzVGhyb3VnaEV2ZW50c0lmTmVlZGVkKFxuICAgICAgZSxcbiAgICAgIHBhcmVudFBvcnQsXG4gICAgICBzdG9yeWJvYXJkSWQsXG4gICAgKTtcblxuICAgIGNvbnN0IGlzU2Nyb2xsU2hvcnRjdXQgPSBlLmFsdEtleTtcbiAgICBjb25zdCBpc1pvb21TaG9ydGN1dCA9IGUuY3RybEtleSB8fCBlLm1ldGFLZXk7XG5cbiAgICAvLyBJZiB0aGUgdXNlciB3YW50cyB0byBzY3JvbGwgKGVpdGhlciBieSBiZWluZyBpbiBkcml2ZSBtb2RlLCBvciBieSBob2xkaW5nIGFsdClcbiAgICAvLyBhbmQgdGhleSBhcmVuJ3QgdHJ5aW5nIHRvIHpvb20sIGZhbGxiYWNrIHRvIGRlZmF1bHQgYmVoYXZpb3VyLlxuICAgIGlmICghaXNab29tU2hvcnRjdXQgJiYgKHBhc3NlZFRocm91Z2ggfHwgaXNTY3JvbGxTaG9ydGN1dCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgIGNvbnN0IGltcG9ydGFudEZpZWxkcyA9IHtcbiAgICAgIGRlbHRhWDogZS5kZWx0YVgsXG4gICAgICBkZWx0YVk6IGUuZGVsdGFZLFxuICAgICAgd2hlZWxEZWx0YTogZS53aGVlbERlbHRhLFxuICAgICAgeDogZS54LFxuICAgICAgeTogZS55LFxuICAgICAgYWx0S2V5OiBlLmFsdEtleSxcbiAgICAgIGN0cmxLZXk6IGUuY3RybEtleSxcbiAgICAgIHNoaWZ0S2V5OiBlLnNoaWZ0S2V5LFxuICAgICAgbWV0YUtleTogZS5tZXRhS2V5LFxuICAgIH07XG5cbiAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKHtcbiAgICAgIGlkOiBGSVhFRF9JRlJBTUVfTUVTU0FHRV9JRFMuV0hFRUxfRVZFTlQsXG4gICAgICBldmVudDogaW1wb3J0YW50RmllbGRzLFxuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IGFjdGl2ZUVsZW1lbnRNZXRhZGF0YSA9ICgpID0+IHtcbiAgICBjb25zdCBhY3RpdmVFbGVtZW50ID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudDtcbiAgICBsZXQgdGFnTmFtZSwgaXNDb250ZW50RWRpdGFibGUsIGVsZW1lbnRUeXBlO1xuXG4gICAgaWYgKGFjdGl2ZUVsZW1lbnQpIHtcbiAgICAgIHRhZ05hbWUgPSBhY3RpdmVFbGVtZW50LnRhZ05hbWU7XG5cbiAgICAgIGlmIChhY3RpdmVFbGVtZW50IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgaXNDb250ZW50RWRpdGFibGUgPSBhY3RpdmVFbGVtZW50LmlzQ29udGVudEVkaXRhYmxlO1xuICAgICAgfVxuXG4gICAgICBpZiAoYWN0aXZlRWxlbWVudCBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnQpIHtcbiAgICAgICAgZWxlbWVudFR5cGUgPSBhY3RpdmVFbGVtZW50LnR5cGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRhZ05hbWU6IHRhZ05hbWUsXG4gICAgICBpc0NvbnRlbnRFZGl0YWJsZTogaXNDb250ZW50RWRpdGFibGUsXG4gICAgICBlbGVtZW50VHlwZTogZWxlbWVudFR5cGUsXG4gICAgfTtcbiAgfTtcblxuICBjb25zdCBvbktleURvd24gPSAoZTogYW55LCBwYXJlbnRQb3J0OiBhbnkpID0+IHtcbiAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKHtcbiAgICAgIGlkOiBGSVhFRF9JRlJBTUVfTUVTU0FHRV9JRFMuS0VZX0RPV05fRVZFTlQsXG4gICAgICBldmVudDoge1xuICAgICAgICBrZXk6IGUua2V5LFxuICAgICAgICBtZXRhS2V5OiBlLm1ldGFLZXksXG4gICAgICAgIHNoaWZ0S2V5OiBlLnNoaWZ0S2V5LFxuICAgICAgICBjdHJsS2V5OiBlLmN0cmxLZXksXG4gICAgICAgIGFjdGl2ZUVsZW1lbnQ6IHtcbiAgICAgICAgICAuLi5hY3RpdmVFbGVtZW50TWV0YWRhdGEoKSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3Qgb25LZXlVcCA9IChlOiBhbnksIHBhcmVudFBvcnQ6IGFueSkgPT4ge1xuICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgaWQ6IEZJWEVEX0lGUkFNRV9NRVNTQUdFX0lEUy5LRVlfVVBfRVZFTlQsXG4gICAgICBldmVudDoge1xuICAgICAgICBrZXk6IGUua2V5LFxuICAgICAgICBtZXRhS2V5OiBlLm1ldGFLZXksXG4gICAgICAgIHNoaWZ0S2V5OiBlLnNoaWZ0S2V5LFxuICAgICAgICBjdHJsS2V5OiBlLmN0cmxLZXksXG4gICAgICAgIGFjdGl2ZUVsZW1lbnQ6IHtcbiAgICAgICAgICAuLi5hY3RpdmVFbGVtZW50TWV0YWRhdGEoKSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgdGhyb3R0bGVkVXBkYXRlT3V0bGluZXMgPSBfLnRocm90dGxlKFxuICAgIChwYXJlbnRQb3J0OiBhbnksIHN0b3J5Ym9hcmRJZDogc3RyaW5nKSA9PlxuICAgICAgdXBkYXRlT3V0bGluZXMocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKSxcbiAgICAxNSxcbiAgKTtcblxuICBjb25zdCBvblNjcm9sbCA9IChlOiBhbnksIHBhcmVudFBvcnQ6IGFueSwgc3Rvcnlib2FyZElkOiBzdHJpbmcpID0+IHtcbiAgICB0aHJvdHRsZWRVcGRhdGVPdXRsaW5lcyhwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICB9O1xuXG4gIC8vIE5lZWQgdG8gcmVnaXN0ZXIgZnVuY3Rpb25zIG9uIHRoZSB3aW5kb3cgZm9yIGNoYW5uZWwgbWVzc2FnaW5nIHRvIHVzZSB0aGVtXG4gIC8vIEB0cy1pZ25vcmVcbiAgd2luZG93LmluaXRQcm9qZWN0ID0gKFxuICAgIHBhcmVudFBvcnQ6IGFueSxcbiAgICBzdG9yeWJvYXJkSWQ6IHN0cmluZyxcbiAgICB0cmVlRWxlbWVudExvb2t1cDoge30sXG4gICAgc2NvcGVMb29rdXA6IHt9LFxuICAgIHN0b3J5Ym9hcmRDb21wb25lbnRFbGVtZW50PzogYW55LFxuICAgIG9wdGlvbnM6IHtcbiAgICAgIGRyaXZlTW9kZUVuYWJsZWQ/OiBib29sZWFuO1xuICAgICAgYWlDb250ZXh0U2VsZWN0aW9uPzogYm9vbGVhbjtcbiAgICB9ID0ge30sXG4gICAgc3Rvcnlib2FyZFR5cGU/OiBzdHJpbmcsXG4gICAgc2F2ZWRDb21wb25lbnRGaWxlbmFtZT86IHN0cmluZyxcbiAgICBvcmlnaW5hbFN0b3J5Ym9hcmRVcmw/OiBzdHJpbmcsXG4gICkgPT4ge1xuICAgIGNvbnN0IHBhc3NpdmU6IGFueSA9IG1ha2VQYXNzaXZlRXZlbnRPcHRpb24oKTtcbiAgICBwYXNzaXZlWydjYXB0dXJlJ10gPSB0cnVlO1xuXG4gICAgY29uc3QgYm9keSQgPSAkKCdib2R5Jyk7XG5cbiAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbShUUkVFX0VMRU1FTlRfTE9PS1VQLCB0cmVlRWxlbWVudExvb2t1cCk7XG4gICAgc2V0TWVtb3J5U3RvcmFnZUl0ZW0oU0NPUEVfTE9PS1VQLCBzY29wZUxvb2t1cCk7XG5cbiAgICBpZiAoc3Rvcnlib2FyZENvbXBvbmVudEVsZW1lbnQpIHtcbiAgICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKFNUT1JZQk9BUkRfQ09NUE9ORU5ULCBzdG9yeWJvYXJkQ29tcG9uZW50RWxlbWVudCk7XG4gICAgfVxuXG4gICAgc2V0TWVtb3J5U3RvcmFnZUl0ZW0oU1RPUllCT0FSRF9UWVBFLCBzdG9yeWJvYXJkVHlwZSk7XG5cbiAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbShcbiAgICAgIFNBVkVEX1NUT1JZQk9BUkRfQ09NUE9ORU5UX0ZJTEVOQU1FLFxuICAgICAgc2F2ZWRDb21wb25lbnRGaWxlbmFtZSxcbiAgICApO1xuXG4gICAgLy8gVGhlIFVSTCB0aGF0IHdhcyBvcmlnaW5hbGx5IGxvYWRlZCBmb3IgdGhpcyBzdG9yeWJvYXJkLCBpdCBtYXkgYmUgZGlmZmVyZW50IGZyb20gaHJlZlxuICAgIC8vIGlmIHRoZSB1c2VyIG5hdmlnYXRlZCBhd2F5IHRvIGEgbmV3IHJvdXRlXG4gICAgaWYgKG9yaWdpbmFsU3Rvcnlib2FyZFVybCkge1xuICAgICAgc2V0TWVtb3J5U3RvcmFnZUl0ZW0oT1JJR0lOQUxfU1RPUllCT0FSRF9VUkwsIG9yaWdpbmFsU3Rvcnlib2FyZFVybCk7XG4gICAgfVxuXG4gICAgLy8gQ2xlYXIgaWZyYW1lIG91dGxpbmVzXG4gICAgcmVtb3ZlTWVtb3J5U3RvcmFnZUl0ZW0oU0VMRUNURURfRUxFTUVOVF9LRVkpO1xuICAgIHJlbW92ZU1lbW9yeVN0b3JhZ2VJdGVtKEhPVkVSRURfRUxFTUVOVF9LRVkpO1xuICAgIHVwZGF0ZU91dGxpbmVzKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG5cbiAgICAvLyBSZWdpc3RlciBldmVudCBsaXN0ZW5lcnNcbiAgICBjb25zdCBib2R5T2JqZWN0ID0gYm9keSQuZ2V0KDApO1xuICAgIGJvZHlPYmplY3Q/LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAnY2xpY2snLFxuICAgICAgKGU6IGFueSkgPT4ge1xuICAgICAgICBwYXNzVGhyb3VnaEV2ZW50c0lmTmVlZGVkKGUsIHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgICB9LFxuICAgICAgcGFzc2l2ZSxcbiAgICApO1xuICAgIGJvZHlPYmplY3Q/LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAncG9pbnRlcm92ZXInLFxuICAgICAgKGU6IGFueSkgPT4ge1xuICAgICAgICBvblBvaW50ZXJPdmVyKGUsIHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgICB9LFxuICAgICAgcGFzc2l2ZSxcbiAgICApO1xuICAgIGJvZHlPYmplY3Q/LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAncG9pbnRlcmRvd24nLFxuICAgICAgKGU6IGFueSkgPT4ge1xuICAgICAgICBvblBvaW50ZXJEb3duKGUsIHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgICB9LFxuICAgICAgcGFzc2l2ZSxcbiAgICApO1xuICAgIGJvZHlPYmplY3Q/LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAncG9pbnRlcnVwJyxcbiAgICAgIChlOiBhbnkpID0+IHtcbiAgICAgICAgb25Qb2ludGVyVXAoZSwgcGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgICAgIH0sXG4gICAgICBwYXNzaXZlLFxuICAgICk7XG4gICAgYm9keU9iamVjdD8uYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICdwb2ludGVybW92ZScsXG4gICAgICAoZTogYW55KSA9PiB7XG4gICAgICAgIG9uUG9pbnRlck1vdmUoZSwgcGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgICAgIH0sXG4gICAgICBwYXNzaXZlLFxuICAgICk7XG4gICAgYm9keU9iamVjdD8uYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICdwb2ludGVybGVhdmUnLFxuICAgICAgKGU6IGFueSkgPT4ge1xuICAgICAgICBwYXNzVGhyb3VnaEV2ZW50c0lmTmVlZGVkKGUsIHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgICB9LFxuICAgICAgcGFzc2l2ZSxcbiAgICApO1xuICAgIGJvZHlPYmplY3Q/LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAnY29udGV4dG1lbnUnLFxuICAgICAgKGU6IGFueSkgPT4ge1xuICAgICAgICBvbkNsaWNrRWxlbWVudENvbnRleHRNZW51KGUsIHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgICB9LFxuICAgICAgcGFzc2l2ZSxcbiAgICApO1xuICAgIGJvZHlPYmplY3Q/LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAnZGJsY2xpY2snLFxuICAgICAgKGU6IGFueSkgPT4ge1xuICAgICAgICBwYXNzVGhyb3VnaEV2ZW50c0lmTmVlZGVkKGUsIHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgICB9LFxuICAgICAgcGFzc2l2ZSxcbiAgICApO1xuXG4gICAgYm9keU9iamVjdD8uYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICdtb3VzZW92ZXInLFxuICAgICAgKGU6IGFueSkgPT4ge1xuICAgICAgICBwYXNzVGhyb3VnaEV2ZW50c0lmTmVlZGVkKGUsIHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgICB9LFxuICAgICAgcGFzc2l2ZSxcbiAgICApO1xuICAgIGJvZHlPYmplY3Q/LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAnbW91c2VvdXQnLFxuICAgICAgKGU6IGFueSkgPT4ge1xuICAgICAgICBwYXNzVGhyb3VnaEV2ZW50c0lmTmVlZGVkKGUsIHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgICB9LFxuICAgICAgcGFzc2l2ZSxcbiAgICApO1xuICAgIGJvZHlPYmplY3Q/LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAnbW91c2Vtb3ZlJyxcbiAgICAgIChlOiBhbnkpID0+IHtcbiAgICAgICAgcGFzc1Rocm91Z2hFdmVudHNJZk5lZWRlZChlLCBwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICAgICAgfSxcbiAgICAgIHBhc3NpdmUsXG4gICAgKTtcbiAgICBib2R5T2JqZWN0Py5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgJ21vdXNlZG93bicsXG4gICAgICAoZTogYW55KSA9PiB7XG4gICAgICAgIHBhc3NUaHJvdWdoRXZlbnRzSWZOZWVkZWQoZSwgcGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgICAgIH0sXG4gICAgICBwYXNzaXZlLFxuICAgICk7XG4gICAgYm9keU9iamVjdD8uYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICdtb3VzZXVwJyxcbiAgICAgIChlOiBhbnkpID0+IHtcbiAgICAgICAgcGFzc1Rocm91Z2hFdmVudHNJZk5lZWRlZChlLCBwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICAgICAgfSxcbiAgICAgIHBhc3NpdmUsXG4gICAgKTtcbiAgICBib2R5T2JqZWN0Py5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgJ3doZWVsJyxcbiAgICAgIChlOiBhbnkpID0+IHtcbiAgICAgICAgb25XaGVlbChlLCBwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICAgICAgfSxcbiAgICAgIHBhc3NpdmUsXG4gICAgKTtcblxuICAgIGJvZHlPYmplY3Q/LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAna2V5ZG93bicsXG4gICAgICAoZTogYW55KSA9PiB7XG4gICAgICAgIG9uS2V5RG93bihlLCBwYXJlbnRQb3J0KTtcbiAgICAgIH0sXG4gICAgICBwYXNzaXZlLFxuICAgICk7XG5cbiAgICBib2R5T2JqZWN0Py5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgJ2tleXVwJyxcbiAgICAgIChlOiBhbnkpID0+IHtcbiAgICAgICAgb25LZXlVcChlLCBwYXJlbnRQb3J0KTtcbiAgICAgIH0sXG4gICAgICBwYXNzaXZlLFxuICAgICk7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICdzY3JvbGwnLFxuICAgICAgKGU6IGFueSkgPT4ge1xuICAgICAgICBvblNjcm9sbChlLCBwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICAgICAgfSxcbiAgICAgIHBhc3NpdmUsXG4gICAgKTtcblxuICAgIC8vIEhhY2s6IHRoaXMgaXMgdXNlZCB0b1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAncG9pbnRlcmxvY2tjaGFuZ2UnLFxuICAgICAgKCkgPT4ge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgZG9jdW1lbnQucG9pbnRlckxvY2tFbGVtZW50ICYmXG4gICAgICAgICAgZ2V0TWVtb3J5U3RvcmFnZUl0ZW0oSU1NRURJQVRFTFlfUkVNT1ZFX1BPSU5URVJfTE9DSylcbiAgICAgICAgKSB7XG4gICAgICAgICAgZG9jdW1lbnQuZXhpdFBvaW50ZXJMb2NrKCk7XG4gICAgICAgICAgc2V0TWVtb3J5U3RvcmFnZUl0ZW0oSU1NRURJQVRFTFlfUkVNT1ZFX1BPSU5URVJfTE9DSywgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgZmFsc2UsXG4gICAgKTtcblxuICAgIGNvbnN0IGRlYm91bmNlRXhlY3V0b3IgPSBuZXcgRGVib3VuY2VFeGVjdXRvcigpO1xuXG4gICAgY29uc3Qgb2Jqc1RvT2JzZXJ2ZSA9IFtib2R5T2JqZWN0IGFzIEhUTUxFbGVtZW50XTtcbiAgICBjb25zdCBuZXh0QnVpbGRXYXRjaGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ19fbmV4dC1idWlsZC13YXRjaGVyJyk7XG4gICAgaWYgKG5leHRCdWlsZFdhdGNoZXIgJiYgbmV4dEJ1aWxkV2F0Y2hlci5zaGFkb3dSb290KSB7XG4gICAgICAvLyBJZiB0aGlzIGlzIE5leHRKUywgYWxzbyBsaXN0ZW4gdG8gdGhlIHNoYWRvdyByb290IG9mIHRoZSBfX25leHQtYnVpbGQtd2F0Y2hlclxuICAgICAgLy8gVGhpcyB0cmlnZ2VyZXMgdGhlIG9uRE9NQ2hhbmdlZCB3aGVuIHRoZSBob3QgcmVsb2FkIHN5bWJvbCBzaG93cyB1cFxuICAgICAgb2Jqc1RvT2JzZXJ2ZS5wdXNoKFxuICAgICAgICAuLi4oQXJyYXkuZnJvbShuZXh0QnVpbGRXYXRjaGVyLnNoYWRvd1Jvb3QuY2hpbGRyZW4pIGFzIEhUTUxFbGVtZW50W10pLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBnbG9iYWxVSVVwZGF0ZVJ1bm5lciA9IG9ic2VydmVET00ob2Jqc1RvT2JzZXJ2ZSwgKGU6IGFueSkgPT4ge1xuICAgICAgZGVib3VuY2VFeGVjdXRvci5zY2hlZHVsZSgoKSA9PiB7XG4gICAgICAgIG9uRE9NQ2hhbmdlZCh7XG4gICAgICAgICAgbXV0YXRpb25zOiBlLFxuICAgICAgICAgIHBhcmVudFBvcnQsXG4gICAgICAgICAgc3Rvcnlib2FyZElkLFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaWYgKG9wdGlvbnMuZHJpdmVNb2RlRW5hYmxlZCkge1xuICAgICAgZW5hYmxlRHJpdmVNb2RlKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRpc2FibGVEcml2ZU1vZGUocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5haUNvbnRleHRTZWxlY3Rpb24pIHtcbiAgICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKCdhaUNvbnRleHQnLCB0cnVlKTtcbiAgICAgIHVwZGF0ZU91dGxpbmVzKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKCdhaUNvbnRleHQnLCBmYWxzZSk7XG4gICAgICB1cGRhdGVPdXRsaW5lcyhwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICAgIH1cblxuICAgIC8vIEJ1aWxkIHRoZSBOYXYgVHJlZSBhbmQgc2VuZCBpdCBiYWNrXG4gICAgdHJ5IHtcbiAgICAgIGdsb2JhbFVJVXBkYXRlUnVubmVyKCgpID0+IHtcbiAgICAgICAgYnVpbGRBbmRTZW5kTmF2VHJlZShcbiAgICAgICAgICBwYXJlbnRQb3J0LFxuICAgICAgICAgIHN0b3J5Ym9hcmRJZCxcbiAgICAgICAgICB0cmVlRWxlbWVudExvb2t1cCxcbiAgICAgICAgICBzY29wZUxvb2t1cCxcbiAgICAgICAgICBzdG9yeWJvYXJkQ29tcG9uZW50RWxlbWVudCB8fCAnRVhQTElDSVRfTk9ORScsXG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGJ1aWxkaW5nIG5hdiB0cmVlOiAnICsgZSk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGVuYWJsZURyaXZlTW9kZSA9IChwYXJlbnRQb3J0OiBhbnksIHN0b3J5Ym9hcmRJZDogc3RyaW5nKSA9PiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGlmICghZ2V0U2Vzc2lvblN0b3JhZ2VJdGVtKCdkcml2ZU1vZGVFbmFibGVkJywgc3Rvcnlib2FyZElkKSkge1xuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgc2V0U2Vzc2lvblN0b3JhZ2VJdGVtKCdkcml2ZU1vZGVFbmFibGVkJywgJ2VuYWJsZWQnLCBzdG9yeWJvYXJkSWQpO1xuICAgICAgY2xlYXJIb3ZlcmVkRWxlbWVudHMocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgICAgIGNsZWFyQWxsT3V0bGluZXMoKTtcbiAgICB9XG5cbiAgICAkKCdib2R5JykuY3NzKCdjdXJzb3InLCAnJyk7XG4gIH07XG5cbiAgY29uc3QgZGlzYWJsZURyaXZlTW9kZSA9IChwYXJlbnRQb3J0OiBhbnksIHN0b3J5Ym9hcmRJZDogc3RyaW5nKSA9PiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGlmIChnZXRTZXNzaW9uU3RvcmFnZUl0ZW0oJ2RyaXZlTW9kZUVuYWJsZWQnLCBzdG9yeWJvYXJkSWQpKSB7XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICByZW1vdmVTZXNzaW9uU3RvcmFnZUl0ZW0oJ2RyaXZlTW9kZUVuYWJsZWQnLCBzdG9yeWJvYXJkSWQpO1xuICAgICAgdXBkYXRlT3V0bGluZXMocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgICAgIGNsZWFySG92ZXJlZEVsZW1lbnRzKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgfVxuXG4gICAgJCgnYm9keScpLmF0dHIoJ3N0eWxlJywgZnVuY3Rpb24gKGksIHMpIHtcbiAgICAgIHJldHVybiAocyB8fCAnJykgKyAnY3Vyc29yOiBkZWZhdWx0ICFpbXBvcnRhbnQ7JztcbiAgICB9KTtcbiAgfTtcblxuICAvLyBAdHMtaWdub3JlXG4gIHdpbmRvdy5lbmFibGVEcml2ZU1vZGUgPSAocGFyZW50UG9ydDogYW55LCBzdG9yeWJvYXJkSWQ6IHN0cmluZykgPT4ge1xuICAgIGVuYWJsZURyaXZlTW9kZShwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICB9O1xuXG4gIC8vIEB0cy1pZ25vcmVcbiAgd2luZG93LmRpc2FibGVEcml2ZU1vZGUgPSAocGFyZW50UG9ydDogYW55LCBzdG9yeWJvYXJkSWQ6IHN0cmluZykgPT4ge1xuICAgIGRpc2FibGVEcml2ZU1vZGUocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgfTtcblxuICAvLyBAdHMtaWdub3JlXG4gIHdpbmRvdy5zZXROZXdMb29rdXBzID0gKFxuICAgIHBhcmVudFBvcnQ6IGFueSxcbiAgICBzdG9yeWJvYXJkSWQ6IHN0cmluZyxcbiAgICB0cmVlRWxlbWVudExvb2t1cDogYW55LFxuICAgIHNjb3BlTG9va3VwOiBhbnksXG4gICkgPT4ge1xuICAgIGNvbnN0IHByZXZUcmVlRWxlbW50TG9va3VwID1cbiAgICAgIGdldE1lbW9yeVN0b3JhZ2VJdGVtKFRSRUVfRUxFTUVOVF9MT09LVVApIHx8IHt9O1xuXG4gICAgY29uc3QgcHJldlNjb3BlTG9va3VwID0gZ2V0TWVtb3J5U3RvcmFnZUl0ZW0oU0NPUEVfTE9PS1VQKSB8fCB7fTtcblxuICAgIGNvbnN0IG5ld1RyZWVFbGVtZW50czogYW55ID0ge1xuICAgICAgLi4ucHJldlRyZWVFbGVtbnRMb29rdXAsXG4gICAgfTtcblxuICAgIC8vIERlbGV0ZSBhbnkgdHJlZSBlbGVtZW50cyB0aGF0IHdlcmUgc2V0IHRvIG51bFxuICAgIE9iamVjdC5rZXlzKHRyZWVFbGVtZW50TG9va3VwKS5mb3JFYWNoKChrZXk6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKHRyZWVFbGVtZW50TG9va3VwW2tleV0pIHtcbiAgICAgICAgbmV3VHJlZUVsZW1lbnRzW2tleV0gPSB0cmVlRWxlbWVudExvb2t1cFtrZXldO1xuICAgICAgfSBlbHNlIGlmIChuZXdUcmVlRWxlbWVudHNba2V5XSkge1xuICAgICAgICBkZWxldGUgbmV3VHJlZUVsZW1lbnRzW2tleV07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBuZXdTY29wZXM6IGFueSA9IHtcbiAgICAgIC4uLnByZXZTY29wZUxvb2t1cCxcbiAgICB9O1xuXG4gICAgLy8gRGVsZXRlIGFueSBzY29wZXMgdGhhdCB3ZXJlIHNldCB0byBudWxcbiAgICBPYmplY3Qua2V5cyhzY29wZUxvb2t1cCkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIGlmIChzY29wZUxvb2t1cFtrZXldKSB7XG4gICAgICAgIG5ld1Njb3Blc1trZXldID0gc2NvcGVMb29rdXBba2V5XTtcbiAgICAgIH0gZWxzZSBpZiAobmV3U2NvcGVzW2tleV0pIHtcbiAgICAgICAgZGVsZXRlIG5ld1Njb3Blc1trZXldO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgc2V0TWVtb3J5U3RvcmFnZUl0ZW0oVFJFRV9FTEVNRU5UX0xPT0tVUCwgbmV3VHJlZUVsZW1lbnRzKTtcbiAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbShTQ09QRV9MT09LVVAsIG5ld1Njb3Blcyk7XG4gIH07XG5cbiAgLy8gQHRzLWlnbm9yZVxuICB3aW5kb3cuc2V0SG92ZXJlZEVsZW1lbnQgPSAoXG4gICAgcGFyZW50UG9ydDogYW55LFxuICAgIHN0b3J5Ym9hcmRJZDogc3RyaW5nLFxuICAgIGVsZW1lbnRLZXk6IHN0cmluZyxcbiAgKSA9PiB7XG4gICAgY29uc3QgZHJpdmVNb2RlRW5hYmxlZCA9ICEhZ2V0U2Vzc2lvblN0b3JhZ2VJdGVtKFxuICAgICAgJ2RyaXZlTW9kZUVuYWJsZWQnLFxuICAgICAgc3Rvcnlib2FyZElkLFxuICAgICk7XG4gICAgaWYgKGRyaXZlTW9kZUVuYWJsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBwcmV2SG92ZXJlZEVsZW1lbnRLZXkgPSBnZXRNZW1vcnlTdG9yYWdlSXRlbShIT1ZFUkVEX0VMRU1FTlRfS0VZKTtcbiAgICBpZiAocHJldkhvdmVyZWRFbGVtZW50S2V5ID09PSBlbGVtZW50S2V5KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGVsZW1lbnRLZXkpIHtcbiAgICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKEhPVkVSRURfRUxFTUVOVF9LRVksIGVsZW1lbnRLZXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZW1vdmVNZW1vcnlTdG9yYWdlSXRlbShIT1ZFUkVEX0VMRU1FTlRfS0VZKTtcbiAgICB9XG5cbiAgICB1cGRhdGVPdXRsaW5lcyhwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICB9O1xuXG4gIC8vIEB0cy1pZ25vcmVcbiAgd2luZG93LnNldFNlbGVjdGVkRWxlbWVudCA9IChcbiAgICBwYXJlbnRQb3J0OiBhbnksXG4gICAgc3Rvcnlib2FyZElkOiBzdHJpbmcsXG4gICAgZWxlbWVudEtleTogc3RyaW5nLFxuICApID0+IHtcbiAgICBjb25zdCBwcmV2U2VsZWN0ZWRFbGVtZW50S2V5ID0gZ2V0TWVtb3J5U3RvcmFnZUl0ZW0oU0VMRUNURURfRUxFTUVOVF9LRVkpO1xuICAgIGlmIChwcmV2U2VsZWN0ZWRFbGVtZW50S2V5ID09PSBlbGVtZW50S2V5KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGVsZW1lbnRLZXkpIHtcbiAgICAgIGNvbnN0IHRlbXBvRWxlbWVudCA9IFRlbXBvRWxlbWVudC5mcm9tS2V5KGVsZW1lbnRLZXkpO1xuICAgICAgbGV0IGVsZW1lbnRLZXlUb0V4dHJhY3QgPSBlbGVtZW50S2V5O1xuXG4gICAgICBpZiAodGVtcG9FbGVtZW50LmlzU3Rvcnlib2FyZChzdG9yeWJvYXJkSWQpKSB7XG4gICAgICAgIC8vIFBhc3MgYmFjayB0aGUgb3V0ZXJIVE1MIG9mIHRoZSB0b3AgbGV2ZWwgbm9kZVxuICAgICAgICBjb25zdCB0b3BMZXZlbE5vZGU6IE5hdlRyZWVOb2RlID1cbiAgICAgICAgICBnZXRNZW1vcnlTdG9yYWdlSXRlbShDVVJSRU5UX05BVl9UUkVFKTtcbiAgICAgICAgY29uc3QgdG9wTGV2ZWxFbGVtZW50S2V5ID0gdG9wTGV2ZWxOb2RlPy50ZW1wb0VsZW1lbnQ/LmdldEtleSgpO1xuICAgICAgICBpZiAodG9wTGV2ZWxFbGVtZW50S2V5KSB7XG4gICAgICAgICAgZWxlbWVudEtleVRvRXh0cmFjdCA9IHRvcExldmVsRWxlbWVudEtleTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBTZW5kIGJhY2sgdGhlIG1lc3NhZ2UganVzdCB0byBzZXQgdGhlIG91dGVySFRNTCBvbmx5XG4gICAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgaWQ6IEZJWEVEX0lGUkFNRV9NRVNTQUdFX0lEUy5TRUxFQ1RFRF9FTEVNRU5UX0tFWSxcbiAgICAgICAgZG9Ob3RTZXRFbGVtZW50S2V5OiB0cnVlLFxuICAgICAgICBvdXRlckhUTUw6ICQoYC4ke0VMRU1FTlRfS0VZX1BSRUZJWH0ke2VsZW1lbnRLZXlUb0V4dHJhY3R9YCkuZ2V0KDApXG4gICAgICAgICAgPy5vdXRlckhUTUwsXG4gICAgICB9KTtcbiAgICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKFNFTEVDVEVEX0VMRU1FTlRfS0VZLCBlbGVtZW50S2V5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgIGlkOiBGSVhFRF9JRlJBTUVfTUVTU0FHRV9JRFMuU0VMRUNURURfRUxFTUVOVF9LRVksXG4gICAgICAgIGRvTm90U2V0RWxlbWVudEtleTogdHJ1ZSxcbiAgICAgICAgb3V0ZXJIVE1MOiBudWxsLFxuICAgICAgfSk7XG4gICAgICByZW1vdmVNZW1vcnlTdG9yYWdlSXRlbShTRUxFQ1RFRF9FTEVNRU5UX0tFWSk7XG4gICAgfVxuXG4gICAgdXBkYXRlT3V0bGluZXMocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgfTtcblxuICAvLyBAdHMtaWdub3JlXG4gIHdpbmRvdy5zZXRNdWx0aXNlbGVjdGVkRWxlbWVudEtleXMgPSAoXG4gICAgcGFyZW50UG9ydDogYW55LFxuICAgIHN0b3J5Ym9hcmRJZDogc3RyaW5nLFxuICAgIGVsZW1lbnRLZXlzOiBzdHJpbmdbXSxcbiAgKSA9PiB7XG4gICAgY29uc3QgcHJldk11bHRpU2VsZWN0ZWRFbGVtZW50S2V5cyA9IGdldE1lbW9yeVN0b3JhZ2VJdGVtKFxuICAgICAgTVVMVElfU0VMRUNURURfRUxFTUVOVF9LRVlTLFxuICAgICk7XG4gICAgY29uc3QgcHJldlNldCA9IG5ldyBTZXQocHJldk11bHRpU2VsZWN0ZWRFbGVtZW50S2V5cyB8fCBbXSk7XG4gICAgY29uc3QgbmV3U2V0ID0gbmV3IFNldChlbGVtZW50S2V5cyB8fCBbXSk7XG4gICAgY29uc3Qgc2V0c0VxdWFsID1cbiAgICAgIHByZXZTZXQuc2l6ZSA9PT0gbmV3U2V0LnNpemUgJiZcbiAgICAgIFsuLi5wcmV2U2V0XS5ldmVyeSgodmFsdWU6IGFueSkgPT4gbmV3U2V0Lmhhcyh2YWx1ZSkpO1xuICAgIGlmIChzZXRzRXF1YWwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZWxlbWVudEtleXMpIHtcbiAgICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKE1VTFRJX1NFTEVDVEVEX0VMRU1FTlRfS0VZUywgZWxlbWVudEtleXMpO1xuICAgICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgIGlkOiBGSVhFRF9JRlJBTUVfTUVTU0FHRV9JRFMuTVVMVElfU0VMRUNURURfRUxFTUVOVF9LRVlTLFxuICAgICAgICBkb05vdFNldEVsZW1lbnRLZXlzOiB0cnVlLFxuICAgICAgICBvdXRlckhUTUxzOiBlbGVtZW50S2V5cz8ubWFwKFxuICAgICAgICAgIChlbGVtZW50S2V5KSA9PlxuICAgICAgICAgICAgJChgLiR7RUxFTUVOVF9LRVlfUFJFRklYfSR7ZWxlbWVudEtleX1gKS5nZXQoMCk/Lm91dGVySFRNTCxcbiAgICAgICAgKSxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZW1vdmVNZW1vcnlTdG9yYWdlSXRlbShNVUxUSV9TRUxFQ1RFRF9FTEVNRU5UX0tFWVMpO1xuICAgICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgIGlkOiBGSVhFRF9JRlJBTUVfTUVTU0FHRV9JRFMuTVVMVElfU0VMRUNURURfRUxFTUVOVF9LRVlTLFxuICAgICAgICBkb05vdFNldEVsZW1lbnRLZXlzOiB0cnVlLFxuICAgICAgICBvdXRlckhUTUxzOiBbXSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHVwZGF0ZU91dGxpbmVzKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gIH07XG5cbiAgLy8gQHRzLWlnbm9yZVxuICB3aW5kb3cucHJvY2Vzc1J1bGVzRm9yU2VsZWN0ZWRFbGVtZW50ID0gKFxuICAgIHBhcmVudFBvcnQ6IGFueSxcbiAgICBzdG9yeWJvYXJkSWQ6IHN0cmluZyxcbiAgICBjc3NFbGVtZW50TG9va3VwOiB7fSxcbiAgICBzZWxlY3RlZEVsZW1lbnRLZXk6IHN0cmluZyxcbiAgKSA9PiB7XG4gICAgcHJvY2Vzc1J1bGVzRm9yU2VsZWN0ZWRFbGVtZW50KFxuICAgICAgcGFyZW50UG9ydCxcbiAgICAgIGNzc0VsZW1lbnRMb29rdXAsXG4gICAgICBzZWxlY3RlZEVsZW1lbnRLZXksXG4gICAgKTtcbiAgfTtcblxuICAvLyBAdHMtaWdub3JlXG4gIHdpbmRvdy5zZXRNb2RpZmllcnNGb3JTZWxlY3RlZEVsZW1lbnQgPSAoXG4gICAgcGFyZW50UG9ydDogYW55LFxuICAgIHN0b3J5Ym9hcmRJZDogc3RyaW5nLFxuICAgIG1vZGlmaWVyczogYW55LFxuICAgIHNlbGVjdGVkRWxlbWVudEtleTogc3RyaW5nLFxuICApID0+IHtcbiAgICBzZXRNb2RpZmllcnNGb3JTZWxlY3RlZEVsZW1lbnQocGFyZW50UG9ydCwgbW9kaWZpZXJzLCBzZWxlY3RlZEVsZW1lbnRLZXkpO1xuICB9O1xuXG4gIC8vIEB0cy1pZ25vcmVcbiAgd2luZG93LmdldENzc0V2YWxzID0gKFxuICAgIHBhcmVudFBvcnQ6IGFueSxcbiAgICBzdG9yeWJvYXJkSWQ6IHN0cmluZyxcbiAgICBzZWxlY3RlZEVsZW1lbnRLZXk6IHN0cmluZyxcbiAgKSA9PiB7XG4gICAgZ2V0Q3NzRXZhbHMocGFyZW50UG9ydCwgc2VsZWN0ZWRFbGVtZW50S2V5KTtcbiAgfTtcblxuICAvLyBAdHMtaWdub3JlXG4gIHdpbmRvdy5ydWxlTWF0Y2hlc0VsZW1lbnQgPSAoXG4gICAgcGFyZW50UG9ydDogYW55LFxuICAgIHN0b3J5Ym9hcmRJZDogc3RyaW5nLFxuICAgIG1lc3NhZ2VJZDogc3RyaW5nLFxuICAgIHJ1bGU6IHN0cmluZyxcbiAgICBzZWxlY3RlZEVsZW1lbnRLZXk6IHN0cmluZyxcbiAgKSA9PiB7XG4gICAgcnVsZU1hdGNoZXNFbGVtZW50KHBhcmVudFBvcnQsIG1lc3NhZ2VJZCwgcnVsZSwgc2VsZWN0ZWRFbGVtZW50S2V5KTtcbiAgfTtcblxuICAvLyBAdHMtaWdub3JlXG4gIHdpbmRvdy5nZXRFbGVtZW50Q2xhc3NMaXN0ID0gKFxuICAgIHBhcmVudFBvcnQ6IGFueSxcbiAgICBzdG9yeWJvYXJkSWQ6IHN0cmluZyxcbiAgICBzZWxlY3RlZEVsZW1lbnRLZXk6IHN0cmluZyxcbiAgKSA9PiB7XG4gICAgZ2V0RWxlbWVudENsYXNzTGlzdChwYXJlbnRQb3J0LCBzZWxlY3RlZEVsZW1lbnRLZXkpO1xuICB9O1xuXG4gIC8vIEB0cy1pZ25vcmVcbiAgd2luZG93LmFwcGx5Q2hhbmdlSXRlbVRvRG9jdW1lbnQgPSBhc3luYyAoXG4gICAgcGFyZW50UG9ydDogYW55LFxuICAgIHN0b3J5Ym9hcmRJZDogc3RyaW5nLFxuICAgIGNoYW5nZUl0ZW06IEFueUNoYW5nZUxlZGdlckl0ZW0sXG4gICkgPT4ge1xuICAgIGNvbnN0IHsgc2VuZE5ld05hdlRyZWUgfSA9IGFwcGx5Q2hhbmdlSXRlbVRvRG9jdW1lbnQoXG4gICAgICBwYXJlbnRQb3J0LFxuICAgICAgc3Rvcnlib2FyZElkLFxuICAgICAgY2hhbmdlSXRlbSxcbiAgICApO1xuXG4gICAgLy8gVXBkYXRlIHRoZSBuYXYgdHJlZSAmIG91dGxpbmVzXG4gICAgaWYgKHNlbmROZXdOYXZUcmVlKSB7XG4gICAgICBidWlsZEFuZFNlbmROYXZUcmVlKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgfVxuICAgIHVwZGF0ZU91dGxpbmVzKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gIH07XG5cbiAgLy8gQHRzLWlnbm9yZVxuICB3aW5kb3cudXBkYXRlQ29kZWJhc2VJZHMgPSAoXG4gICAgcGFyZW50UG9ydDogYW55LFxuICAgIHN0b3J5Ym9hcmRJZDogc3RyaW5nLFxuICAgIHByZXZJZFRvTmV3SWRNYXA6IHsgW3ByZXZDb2RlYmFzZUlkOiBzdHJpbmddOiBzdHJpbmcgfSxcbiAgICBuZXdUcmVlRWxlbWVudExvb2t1cDogYW55LFxuICAgIG5ld1Njb3BlTG9va3VwOiBhbnksXG4gICkgPT4ge1xuICAgIGNvbnN0IHNlbmROZXdOYXZUcmVlID0gdXBkYXRlQ29kZWJhc2VJZHMoXG4gICAgICBwYXJlbnRQb3J0LFxuICAgICAgcHJldklkVG9OZXdJZE1hcCxcbiAgICAgIHRydWUsXG4gICAgKTtcblxuICAgIGlmIChzZW5kTmV3TmF2VHJlZSkge1xuICAgICAgYnVpbGRBbmRTZW5kTmF2VHJlZShcbiAgICAgICAgcGFyZW50UG9ydCxcbiAgICAgICAgc3Rvcnlib2FyZElkLFxuICAgICAgICBuZXdUcmVlRWxlbWVudExvb2t1cCxcbiAgICAgICAgbmV3U2NvcGVMb29rdXAsXG4gICAgICApO1xuICAgIH1cblxuICAgIHVwZGF0ZU91dGxpbmVzKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gIH07XG5cbiAgLy8gQHRzLWlnbm9yZVxuICB3aW5kb3cuZGlzcGF0Y2hFdmVudCA9IChcbiAgICBwYXJlbnRQb3J0OiBhbnksXG4gICAgc3Rvcnlib2FyZElkOiBzdHJpbmcsXG4gICAgZXZlbnROYW1lOiBzdHJpbmcsXG4gICAgZXZlbnREZXRhaWxzOiBhbnksXG4gICkgPT4ge1xuICAgIGNvbnN0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KGV2ZW50TmFtZSwge1xuICAgICAgLi4uZXZlbnREZXRhaWxzLFxuICAgIH0pO1xuICAgIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICB9O1xuXG4gIC8vIEB0cy1pZ25vcmVcbiAgd2luZG93LnVwZGF0ZU91dGxpbmVzID0gKHBhcmVudFBvcnQ6IGFueSwgc3Rvcnlib2FyZElkOiBzdHJpbmcpID0+IHtcbiAgICB1cGRhdGVPdXRsaW5lcyhwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICB9O1xuXG4gIC8vIEB0cy1pZ25vcmVcbiAgd2luZG93LmdvQmFjayA9IChwYXJlbnRQb3J0OiBhbnksIHN0b3J5Ym9hcmRJZDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKGRvY3VtZW50LnJlZmVycmVyICE9PSAnJykge1xuICAgICAgd2luZG93Lmhpc3RvcnkuYmFjaygpO1xuICAgIH1cbiAgfTtcblxuICAvLyBAdHMtaWdub3JlXG4gIHdpbmRvdy5nb0ZvcndhcmQgPSAocGFyZW50UG9ydDogYW55LCBzdG9yeWJvYXJkSWQ6IHN0cmluZykgPT4ge1xuICAgIHdpbmRvdy5oaXN0b3J5LmZvcndhcmQoKTtcbiAgfTtcblxuICAvLyBAdHMtaWdub3JlXG4gIHdpbmRvdy5yZWZyZXNoID0gKHBhcmVudFBvcnQ6IGFueSwgc3Rvcnlib2FyZElkOiBzdHJpbmcpID0+IHtcbiAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gIH07XG5cbiAgLy8gQHRzLWlnbm9yZVxuICB3aW5kb3cuc3ludGhldGljTW91c2VPdmVyID0gKFxuICAgIHBhcmVudFBvcnQ6IGFueSxcbiAgICBzdG9yeWJvYXJkSWQ6IHN0cmluZyxcbiAgICBjb29yZHM6IGFueSxcbiAgICBkb250SG92ZXJJbnNpZGVTZWxlY3RlZDogYm9vbGVhbixcbiAgICBzZWxlY3RCb3R0b21Nb3N0RWxlbWVudDogYm9vbGVhbixcbiAgKSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZG9jdW1lbnQuZWxlbWVudEZyb21Qb2ludChjb29yZHMueCwgY29vcmRzLnkpO1xuXG4gICAgLy8gSWYgdGhpcyBpcyB0cnVlIHdlIGRvbid0IHdhbnQgdG8gdHJpZ2dlciBhIGhvdmVyIGV2ZW50IGluc2lkZSBhIHNlbGVjdGVkIGVsZW1lbnQsIGluc3RlYWQganVzdCBzZXQgaG92ZXJpbmcgb24gdGhlIHNlbGVjdGVkIGVsZW1lbnRcbiAgICBpZiAoZG9udEhvdmVySW5zaWRlU2VsZWN0ZWQpIHtcbiAgICAgIGNvbnN0IHNlbGVjdGVkRWxlbWVudEtleSA9IGdldE1lbW9yeVN0b3JhZ2VJdGVtKFNFTEVDVEVEX0VMRU1FTlRfS0VZKTtcbiAgICAgIGNvbnN0IHNlbGVjdGVkRWxlbWVudCA9IFRlbXBvRWxlbWVudC5mcm9tS2V5KHNlbGVjdGVkRWxlbWVudEtleSk7XG5cbiAgICAgIGlmICghc2VsZWN0ZWRFbGVtZW50LmlzRW1wdHkoKSkge1xuICAgICAgICBjb25zdCBzZWxlY3RlZERvbUVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFxuICAgICAgICAgIGAuJHtFTEVNRU5UX0tFWV9QUkVGSVh9JHtzZWxlY3RlZEVsZW1lbnRLZXl9YCxcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAoc2VsZWN0ZWREb21FbGVtZW50Py5jb250YWlucyh0YXJnZXQpKSB7XG4gICAgICAgICAgb25Qb2ludGVyT3ZlcihcbiAgICAgICAgICAgIHsgdGFyZ2V0OiBzZWxlY3RlZERvbUVsZW1lbnQgfSxcbiAgICAgICAgICAgIHBhcmVudFBvcnQsXG4gICAgICAgICAgICBzdG9yeWJvYXJkSWQsXG4gICAgICAgICAgKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBvblBvaW50ZXJPdmVyKFxuICAgICAgeyB0YXJnZXQgfSxcbiAgICAgIHBhcmVudFBvcnQsXG4gICAgICBzdG9yeWJvYXJkSWQsXG4gICAgICBzZWxlY3RCb3R0b21Nb3N0RWxlbWVudCxcbiAgICApO1xuICB9O1xuXG4gIC8vIEB0cy1pZ25vcmVcbiAgd2luZG93LnN5bnRoZXRpY01vdXNlTW92ZSA9IChcbiAgICBwYXJlbnRQb3J0OiBhbnksXG4gICAgc3Rvcnlib2FyZElkOiBzdHJpbmcsXG4gICAgc3ludGhldGljRXZlbnQ6IHtcbiAgICAgIGNsaWVudFg6IG51bWJlcjtcbiAgICAgIGNsaWVudFk6IG51bWJlcjtcbiAgICAgIGJ1dHRvbnM/OiBudW1iZXI7XG4gICAgfSxcbiAgKSA9PiB7XG4gICAgY29uc3QgZXZlbnRXaXRoQ2xpZW50ID0ge1xuICAgICAgLi4uc3ludGhldGljRXZlbnQsXG4gICAgICBwYWdlWDpcbiAgICAgICAgc3ludGhldGljRXZlbnQuY2xpZW50WCArXG4gICAgICAgIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCB8fCBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnQpLFxuICAgICAgcGFnZVk6XG4gICAgICAgIHN5bnRoZXRpY0V2ZW50LmNsaWVudFkgK1xuICAgICAgICAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCB8fCBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcCksXG4gICAgfTtcblxuICAgIG9uUG9pbnRlck1vdmUoZXZlbnRXaXRoQ2xpZW50LCBwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICB9O1xuXG4gIC8vIEB0cy1pZ25vcmVcbiAgd2luZG93LnN5bnRoZXRpY01vdXNlVXAgPSAoXG4gICAgcGFyZW50UG9ydDogYW55LFxuICAgIHN0b3J5Ym9hcmRJZDogc3RyaW5nLFxuICAgIHN5bnRoZXRpY0V2ZW50OiBhbnksXG4gICkgPT4ge1xuICAgIG9uUG9pbnRlclVwKHN5bnRoZXRpY0V2ZW50LCBwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICB9O1xuXG4gIC8vIEB0cy1pZ25vcmVcbiAgd2luZG93LmNsZWFySG92ZXJlZE91dGxpbmVzID0gKHBhcmVudFBvcnQ6IGFueSwgc3Rvcnlib2FyZElkOiBzdHJpbmcpID0+IHtcbiAgICBpZiAoZ2V0TWVtb3J5U3RvcmFnZUl0ZW0oSE9WRVJFRF9FTEVNRU5UX0tFWSkpIHtcbiAgICAgIGNsZWFySG92ZXJlZEVsZW1lbnRzKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgfVxuICB9O1xuXG4gIC8vIEB0cy1pZ25vcmVcbiAgd2luZG93LnNldFpvb21QZXJjID0gKFxuICAgIHBhcmVudFBvcnQ6IGFueSxcbiAgICBzdG9yeWJvYXJkSWQ6IHN0cmluZyxcbiAgICB6b29tUGVyYzogbnVtYmVyLFxuICApID0+IHtcbiAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbSgnem9vbVBlcmMnLCB6b29tUGVyYy50b1N0cmluZygpKTtcbiAgICB1cGRhdGVPdXRsaW5lcyhwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICB9O1xuXG4gIC8vIEB0cy1pZ25vcmVcbiAgd2luZG93LnNldEFpQ29udGV4dCA9IChcbiAgICBwYXJlbnRQb3J0OiBhbnksXG4gICAgc3Rvcnlib2FyZElkOiBzdHJpbmcsXG4gICAgYWlDb250ZXh0OiBib29sZWFuLFxuICApID0+IHtcbiAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbSgnYWlDb250ZXh0JywgISFhaUNvbnRleHQpO1xuICAgIHVwZGF0ZU91dGxpbmVzKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gIH07XG5cbiAgLy8gQHRzLWlnbm9yZVxuICB3aW5kb3cudGVtcE1vdmVFbGVtZW50ID0gKFxuICAgIHBhcmVudFBvcnQ6IGFueSxcbiAgICBzdG9yeWJvYXJkSWQ6IHN0cmluZyxcbiAgICBub2RlVG9Nb3ZlRWxlbWVudEtleTogc3RyaW5nLFxuICAgIG5ld0luZGV4OiBudW1iZXIsXG4gICkgPT4ge1xuICAgIGNvbnN0IGVsZW1lbnRLZXlUb05hdk5vZGUgPVxuICAgICAgZ2V0TWVtb3J5U3RvcmFnZUl0ZW0oRUxFTUVOVF9LRVlfVE9fTkFWX05PREUpIHx8IHt9O1xuXG4gICAgY29uc3QgbmF2Tm9kZVRvTW92ZSA9IGVsZW1lbnRLZXlUb05hdk5vZGVbbm9kZVRvTW92ZUVsZW1lbnRLZXldO1xuICAgIGlmICghbmF2Tm9kZVRvTW92ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG5vZGVUb01vdmVFbGVtZW50ID0gVGVtcG9FbGVtZW50LmZyb21LZXkobm9kZVRvTW92ZUVsZW1lbnRLZXkpO1xuXG4gICAgY29uc3QgZG9tRWxlbWVudHNUb01vdmU6IGFueVtdID0gW107XG4gICAgLy8gSW4gY29tcG9uZW50cywgdGhlcmUgbWF5IGJlIG11bHRpcGxlIGVsZW1lbnRzIHRoYXQgbmVlZCB0byBiZSBtb3ZlZCwgdGhlIGVsZWVtbnRLZXlUb0xvb2t1cExpc3RcbiAgICAvLyBhcmUgYWxsIHRoZSByZWFsIERPTSBlbGVtZW50cyBpbiBhIGNvbXBvbmVudFxuICAgIC8vIEZvciBub24tY29tcG9uZW50cywgdGhlIGVsZWVtbnRLZXlUb0xvb2t1cExpc3QgcG9pbnRzIHRvIGEgbGlzdCBvZiBpdHNlbGZcbiAgICBjb25zdCBlbGVtZW50S2V5VG9Mb29rdXBMaXN0OiBhbnkgPVxuICAgICAgZ2V0TWVtb3J5U3RvcmFnZUl0ZW0oRUxFTUVOVF9LRVlfVE9fTE9PS1VQX0xJU1QpIHx8IHt9O1xuICAgIGNvbnN0IGxvb2t1cExpc3QgPVxuICAgICAgZWxlbWVudEtleVRvTG9va3VwTGlzdFtuYXZOb2RlVG9Nb3ZlLnRlbXBvRWxlbWVudC5nZXRLZXkoKV0gfHwgW107XG4gICAgbG9va3VwTGlzdC5mb3JFYWNoKChsb29rdXBFbGVtZW50S2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIGRvbUVsZW1lbnRzVG9Nb3ZlLnB1c2goXG4gICAgICAgICQoJ2JvZHknKS5maW5kKGAuJHtFTEVNRU5UX0tFWV9QUkVGSVh9JHtsb29rdXBFbGVtZW50S2V5fWApLmdldCgwKSxcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICBjb25zdCBwYXJlbnREb21FbGVtZW50ID0gZG9tRWxlbWVudHNUb01vdmVbMF0/LnBhcmVudEVsZW1lbnQ7XG4gICAgY29uc3QgcGFyZW50TmF2Tm9kZSA9IG5hdk5vZGVUb01vdmUucGFyZW50O1xuXG4gICAgaWYgKHBhcmVudERvbUVsZW1lbnQgJiYgcGFyZW50TmF2Tm9kZSkge1xuICAgICAgY29uc3QgY3VycmVudEluZGV4ID0gcGFyZW50TmF2Tm9kZT8uY2hpbGRyZW4/LmluZGV4T2YobmF2Tm9kZVRvTW92ZSk7XG4gICAgICBjb25zdCBudW1DaGlsZHJlbiA9IHBhcmVudE5hdk5vZGU/LmNoaWxkcmVuPy5sZW5ndGg7XG5cbiAgICAgIGlmIChjdXJyZW50SW5kZXggIT09IG5ld0luZGV4KSB7XG4gICAgICAgIEFycmF5LmZyb20ocGFyZW50RG9tRWxlbWVudC5jaGlsZHJlbikuZm9yRWFjaCgoY2hpbGQ6IGFueSkgPT4ge1xuICAgICAgICAgICQoY2hpbGQpLmF0dHIoVEVNUE9fSU5TVEFOVF9VUERBVEUsICd0cnVlJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQocGFyZW50RG9tRWxlbWVudCkuYXR0cihURU1QT19JTlNUQU5UX1VQREFURSwgJ3RydWUnKTtcblxuICAgICAgICBpZiAobmV3SW5kZXggPT09IG51bUNoaWxkcmVuIC0gMSkge1xuICAgICAgICAgIGRvbUVsZW1lbnRzVG9Nb3ZlLmZvckVhY2goKGVsZW1lbnQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgZWxlbWVudC5wYXJlbnRFbGVtZW50LmFwcGVuZENoaWxkKGVsZW1lbnQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIElmIHRoZSBjdXJyZW50IGluZGV4IGlzIGJlZm9yZSB0aGUgbmV3IGluZGV4IHRoZW4gd2UgbmVlZCB0byBhZGp1c3QgYnkgMSB0byBhY2NvdW50IGZvciB0aGUgc2hpZnQgaW4gaW5kaWNlc1xuICAgICAgICAgIGNvbnN0IGJlZm9yZU5vZGUgPVxuICAgICAgICAgICAgY3VycmVudEluZGV4ID4gbmV3SW5kZXhcbiAgICAgICAgICAgICAgPyBwYXJlbnROYXZOb2RlPy5jaGlsZHJlbltuZXdJbmRleF1cbiAgICAgICAgICAgICAgOiBwYXJlbnROYXZOb2RlPy5jaGlsZHJlbltuZXdJbmRleCArIDFdO1xuICAgICAgICAgIGNvbnN0IGxvb2t1cExpc3RGb3JCZWZvcmUgPVxuICAgICAgICAgICAgZWxlbWVudEtleVRvTG9va3VwTGlzdFtiZWZvcmVOb2RlPy50ZW1wb0VsZW1lbnQ/LmdldEtleSgpXSB8fCBbXTtcblxuICAgICAgICAgIGlmICghbG9va3VwTGlzdEZvckJlZm9yZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDYW5ub3QgZmluZCBlbGVtZW50IHRvIGluc2VydCBiZWZvcmUgaW4gbG9va3VwIGxpc3QnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBiZWZvcmVEb21FbGVtZW50ID0gJCgnYm9keScpXG4gICAgICAgICAgICAuZmluZChgLiR7RUxFTUVOVF9LRVlfUFJFRklYfSR7bG9va3VwTGlzdEZvckJlZm9yZVswXX1gKVxuICAgICAgICAgICAgLmdldCgwKTtcblxuICAgICAgICAgIGlmICghYmVmb3JlRG9tRWxlbWVudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Nhbm5vdCBmaW5kIGVsZW1lbnQgdG8gaW5zZXJ0IGJlZm9yZScpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGRvbUVsZW1lbnRzVG9Nb3ZlLmZvckVhY2goKGVsZW1lbnQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgZWxlbWVudC5wYXJlbnRFbGVtZW50Lmluc2VydEJlZm9yZShlbGVtZW50LCBiZWZvcmVEb21FbGVtZW50KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgc2VsZWN0ZWQgZWxlbWVudCBrZXkgdG8gdGhlIG5ldyBleHBlY3RlZCBvbmUgKG5vdGUgaWYgbW92aW5nIHRoZXJlIGlzIG5vIGhvdmVyZWQgZWxlbWVudCBrZXkpXG4gICAgICAgIC8vIFRoaXMgYWxzbyBhc3N1bWVzIHRoZSBub2RlVG9Nb3ZlRWxlbWVudEtleSBpcyB0aGUgc2VsZWN0ZWQgZWxlbWVudCBrZXlcbiAgICAgICAgY29uc3QgZWxlbWVudFRvTW92ZVNlZ21lbnRzID0gbm9kZVRvTW92ZUVsZW1lbnQudW5pcXVlUGF0aC5zcGxpdCgnLScpO1xuICAgICAgICBjb25zdCBuZXdTZWxlY3RlZFVuaXF1ZVBhdGggPVxuICAgICAgICAgIGVsZW1lbnRUb01vdmVTZWdtZW50c1xuICAgICAgICAgICAgLnNsaWNlKDAsIGVsZW1lbnRUb01vdmVTZWdtZW50cy5sZW5ndGggLSAxKVxuICAgICAgICAgICAgLmpvaW4oJy0nKSArIGAtJHtuZXdJbmRleH1gO1xuXG4gICAgICAgIGNvbnN0IG5ld1NlbGVjdGVkRWxlbWVudEtleSA9IG5ldyBUZW1wb0VsZW1lbnQoXG4gICAgICAgICAgbm9kZVRvTW92ZUVsZW1lbnQuY29kZWJhc2VJZCxcbiAgICAgICAgICBub2RlVG9Nb3ZlRWxlbWVudC5zdG9yeWJvYXJkSWQsXG4gICAgICAgICAgbmV3U2VsZWN0ZWRVbmlxdWVQYXRoLFxuICAgICAgICApLmdldEtleSgpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgbmF2IHRyZWUgd2hpY2ggYWxzbyBzZXRzIHRoZSBlbGVtZW50IGtleSBvbiBhbGwgdGhlIGVsZW1lbnRzLCBuZWVkIHRvIGRvIHRoaXMgYmVmb3JlXG4gICAgICAgIC8vIHVwZGF0aW5nIHRoZSBzZWxlY3RlZCBlbGVtZW50IGtleVxuICAgICAgICBidWlsZEFuZFNlbmROYXZUcmVlKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG5cbiAgICAgICAgLy8gQ29kZWJhc2UgSUQgZG9lc24ndCBjaGFuZ2VcbiAgICAgICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgaWQ6IEZJWEVEX0lGUkFNRV9NRVNTQUdFX0lEUy5TRUxFQ1RFRF9FTEVNRU5UX0tFWSxcbiAgICAgICAgICBlbGVtZW50S2V5OiBuZXdTZWxlY3RlZEVsZW1lbnRLZXksXG4gICAgICAgICAgb3V0ZXJIVE1MOiAkKGAuJHtFTEVNRU5UX0tFWV9QUkVGSVh9JHtuZXdTZWxlY3RlZEVsZW1lbnRLZXl9YCkuZ2V0KDApXG4gICAgICAgICAgICA/Lm91dGVySFRNTCxcbiAgICAgICAgfSk7XG4gICAgICAgIHNldE1lbW9yeVN0b3JhZ2VJdGVtKFNFTEVDVEVEX0VMRU1FTlRfS0VZLCBuZXdTZWxlY3RlZEVsZW1lbnRLZXkpO1xuXG4gICAgICAgIHVwZGF0ZU91dGxpbmVzKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vIEB0cy1pZ25vcmVcbiAgd2luZG93LnRlbXBBZGREaXYgPSAoXG4gICAgcGFyZW50UG9ydDogYW55LFxuICAgIHN0b3J5Ym9hcmRJZDogc3RyaW5nLFxuICAgIHBhcmVudENvZGViYXNlSWQ6IHN0cmluZyxcbiAgICBpbmRleEluUGFyZW50OiBudW1iZXIsXG4gICAgd2lkdGg6IG51bWJlcixcbiAgICBoZWlnaHQ6IG51bWJlcixcbiAgKSA9PiB7XG4gICAgY29uc3QgZWxlbWVudCA9ICQoYC4ke1RFTVBPX0lOU1RBTlRfRElWX0RSQVdfQ0xBU1N9YCk7XG4gICAgaWYgKGVsZW1lbnQubGVuZ3RoKSB7XG4gICAgICBlbGVtZW50LmNzcygnd2lkdGgnLCB3aWR0aCk7XG4gICAgICBlbGVtZW50LmNzcygnaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHBhcmVudCA9ICQoYC4ke3BhcmVudENvZGViYXNlSWR9YCk7XG4gICAgICBpZiAoIXBhcmVudC5sZW5ndGgpIHtcbiAgICAgICAgcGFyZW50ID0gJCgnYm9keScpO1xuICAgICAgfVxuXG4gICAgICBwYXJlbnQuZWFjaCgoaW5kZXg6IGFueSwgaXRlbTogYW55KSA9PiB7XG4gICAgICAgIGNvbnN0IG5ld0VsZW1lbnQgPSAkKFxuICAgICAgICAgIGA8ZGl2IGNsYXNzPVwiJHtURU1QT19JTlNUQU5UX0RJVl9EUkFXX0NMQVNTfVwiICR7VEVNUE9fREVMRVRFX0FGVEVSX0lOU1RBTlRfVVBEQVRFfT1cInRydWVcIiAke1RFTVBPX0RFTEVURV9BRlRFUl9SRUZSRVNIfT1cInRydWVcIiAke1RFTVBPX0lOU1RBTlRfVVBEQVRFfT1cInRydWVcIj48L2Rpdj5gLFxuICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IGNoaWxkQXRJbmRleCA9ICQoaXRlbSkuY2hpbGRyZW4oKS5lcShpbmRleEluUGFyZW50KTtcbiAgICAgICAgaWYgKGNoaWxkQXRJbmRleD8ubGVuZ3RoKSB7XG4gICAgICAgICAgY2hpbGRBdEluZGV4LmJlZm9yZShuZXdFbGVtZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkKGl0ZW0pLmFwcGVuZChuZXdFbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgbmF2IHRyZWVcbiAgICAgIGJ1aWxkQW5kU2VuZE5hdlRyZWUocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgICB9XG5cbiAgICB1cGRhdGVPdXRsaW5lcyhwYXJlbnRQb3J0LCBzdG9yeWJvYXJkSWQpO1xuICB9O1xuXG4gIC8vIEB0cy1pZ25vcmVcbiAgd2luZG93LnRlbXBNb3ZlVG9OZXdQYXJlbnQgPSAoXG4gICAgcGFyZW50UG9ydDogYW55LFxuICAgIHN0b3J5Ym9hcmRJZDogc3RyaW5nLFxuICAgIGluZGljYXRvcldpZHRoOiBudW1iZXIsXG4gICAgaW5kaWNhdG9ySGVpZ2h0OiBudW1iZXIsXG4gICAgbmV3UG9zaXRpb25YOiBudW1iZXIsXG4gICAgbmV3UG9zaXRpb25ZOiBudW1iZXIsXG4gICAgcGFyZW50RWxlbWVudEtleTogc3RyaW5nLFxuICAgIGNsZWFyOiBib29sZWFuLFxuICApID0+IHtcbiAgICAkKGAuJHtURU1QT19NT1ZFX0JFVFdFRU5fUEFSRU5UU19PVVRMSU5FfWApLnJlbW92ZSgpO1xuXG4gICAgaWYgKGNsZWFyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgbmV3RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIG5ld0VsZW1lbnQuY2xhc3NMaXN0LmFkZChURU1QT19NT1ZFX0JFVFdFRU5fUEFSRU5UU19PVVRMSU5FKTtcbiAgICBuZXdFbGVtZW50LnNldEF0dHJpYnV0ZShURU1QT19JTlNUQU5UX1VQREFURSwgJ3RydWUnKTsgLy8gQWRkIHNvIGl0IGRvZXNuJ3QgdHJpZ2dlciBuZXcgbmF2IHRyZWUgYnVpbGRpbmdcblxuICAgIG5ld0VsZW1lbnQuc3R5bGUud2lkdGggPSBpbmRpY2F0b3JXaWR0aCArICdweCc7XG4gICAgbmV3RWxlbWVudC5zdHlsZS5oZWlnaHQgPSBpbmRpY2F0b3JIZWlnaHQgKyAncHgnO1xuICAgIG5ld0VsZW1lbnQuc3R5bGUubGVmdCA9IG5ld1Bvc2l0aW9uWCArICdweCc7XG4gICAgbmV3RWxlbWVudC5zdHlsZS50b3AgPSBuZXdQb3NpdGlvblkgKyAncHgnO1xuICAgIG5ld0VsZW1lbnQuc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xuICAgIG5ld0VsZW1lbnQuc3R5bGUucG9pbnRlckV2ZW50cyA9ICdub25lJztcbiAgICBuZXdFbGVtZW50LnN0eWxlLnpJbmRleCA9ICcyMDAwMDAwMDA0JztcbiAgICBuZXdFbGVtZW50LnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcbiAgICBuZXdFbGVtZW50LnN0eWxlLmN1cnNvciA9ICdkZWZhdWx0ICFpbXBvcnRhbnQnO1xuICAgIG5ld0VsZW1lbnQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gUFJJTUFSWV9PVVRMSU5FX0NPTE9VUjtcblxuICAgIGNvbnN0IGJvZHkgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnYm9keScpWzBdO1xuICAgIGJvZHkuYXBwZW5kQ2hpbGQobmV3RWxlbWVudCk7XG5cbiAgICBjb25zdCBwYXJlbnREb21FbGVtZW50ID0gJChgLiR7RUxFTUVOVF9LRVlfUFJFRklYfSR7cGFyZW50RWxlbWVudEtleX1gKS5nZXQoXG4gICAgICAwLFxuICAgICk7XG5cbiAgICBpZiAocGFyZW50RG9tRWxlbWVudCkge1xuICAgICAgY29uc3QgYm91bmRpbmdSZWN0ID0gcGFyZW50RG9tRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIGNvbnN0IHBhcmVudE91dGxpbmUgPSBnZXRPdXRsaW5lRWxlbWVudChcbiAgICAgICAgcGFyZW50UG9ydCxcbiAgICAgICAgT3V0bGluZVR5cGUuUFJJTUFSWSxcbiAgICAgICAgYm91bmRpbmdSZWN0LmxlZnQsXG4gICAgICAgIGJvdW5kaW5nUmVjdC50b3AsXG4gICAgICAgIGJvdW5kaW5nUmVjdC53aWR0aCxcbiAgICAgICAgYm91bmRpbmdSZWN0LmhlaWdodCxcbiAgICAgICk7XG5cbiAgICAgIHBhcmVudE91dGxpbmUuY2xhc3NMaXN0LnJlbW92ZShPVVRMSU5FX0NMQVNTKTtcbiAgICAgIHBhcmVudE91dGxpbmUuY2xhc3NMaXN0LmFkZChURU1QT19NT1ZFX0JFVFdFRU5fUEFSRU5UU19PVVRMSU5FKTtcbiAgICAgIHBhcmVudE91dGxpbmUuc2V0QXR0cmlidXRlKFRFTVBPX0lOU1RBTlRfVVBEQVRFLCAndHJ1ZScpOyAvLyBBZGQgc28gaXQgZG9lc24ndCB0cmlnZ2VyIG5ldyBuYXYgdHJlZSBidWlsZGluZ1xuICAgICAgYm9keS5hcHBlbmRDaGlsZChwYXJlbnRPdXRsaW5lKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gQHRzLWlnbm9yZVxuICB3aW5kb3cuY2hlY2tJZkh5ZHJhdGlvbkVycm9yID0gKHBhcmVudFBvcnQ6IGFueSwgc3Rvcnlib2FyZElkOiBzdHJpbmcpID0+IHtcbiAgICBsZXQgZXJyb3JEZXNjciwgZXJyb3JMYWJlbCwgZXJyb3JCb2R5LCBoYXNFcnJvcjtcbiAgICBpZiAod2luZG93LmxvY2F0aW9uLmhyZWYuaW5jbHVkZXMoJ2ZyYW1ld29yaz1WSVRFJykpIHtcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIGNvbnN0IGVycm9yUG9ydGFsID1cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3ZpdGUtZXJyb3Itb3ZlcmxheScpWzBdPy5zaGFkb3dSb290O1xuXG4gICAgICBlcnJvckRlc2NyID0gJ0EgVml0ZSBFcnJvciBPY2N1cnJlZCc7XG4gICAgICBlcnJvckxhYmVsID1cbiAgICAgICAgZXJyb3JQb3J0YWw/LnF1ZXJ5U2VsZWN0b3JBbGw/LignLmZpbGUtbGluaycpPy5bMF0/LmlubmVySFRNTDtcbiAgICAgIGVycm9yQm9keSA9IGVycm9yUG9ydGFsPy5xdWVyeVNlbGVjdG9yQWxsPy4oJy5tZXNzYWdlJyk/LlswXT8uaW5uZXJIVE1MO1xuICAgICAgaGFzRXJyb3IgPSBCb29sZWFuKGVycm9yTGFiZWwgfHwgZXJyb3JCb2R5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgY29uc3QgZXJyb3JQb3J0YWwgPVxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbmV4dGpzLXBvcnRhbCcpWzBdPy5zaGFkb3dSb290O1xuICAgICAgZXJyb3JEZXNjciA9IGVycm9yUG9ydGFsPy5nZXRFbGVtZW50QnlJZD8uKFxuICAgICAgICAnbmV4dGpzX19jb250YWluZXJfZXJyb3JzX2Rlc2MnLFxuICAgICAgKT8uaW5uZXJIVE1MO1xuICAgICAgZXJyb3JMYWJlbCA9IGVycm9yUG9ydGFsPy5nZXRFbGVtZW50QnlJZD8uKFxuICAgICAgICAnbmV4dGpzX19jb250YWluZXJfZXJyb3JzX2xhYmVsJyxcbiAgICAgICk/LmlubmVySFRNTDtcbiAgICAgIGVycm9yQm9keSA9IGVycm9yUG9ydGFsPy5xdWVyeVNlbGVjdG9yQWxsPy4oXG4gICAgICAgICcubmV4dGpzLWNvbnRhaW5lci1lcnJvcnMtYm9keScsXG4gICAgICApPy5bMF0/LmlubmVySFRNTDtcbiAgICAgIGhhc0Vycm9yID0gQm9vbGVhbihlcnJvckRlc2NyKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiB0aGUgY29udGVudHMgb2YgdGhlIGh5ZHJhdGlvbiBjb250YWluZXIgY29udGFpbiB0aGUgdGV4dCBcIkh5ZHJhdGlvbiBmYWlsZWRcIlxuICAgIGlmIChoYXNFcnJvcikge1xuICAgICAgaWYgKGVycm9yRGVzY3I/LmluY2x1ZGVzKCdIeWRyYXRpb24gZmFpbGVkJykpIHtcbiAgICAgICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgaWQ6IEZJWEVEX0lGUkFNRV9NRVNTQUdFX0lEUy5MQVRFU1RfSFlEUkFUSU9OX0VSUk9SX1NUQVRVUyxcbiAgICAgICAgICBzdGF0dXM6IFNUT1JZQk9BUkRfSFlEUkFUSU9OX1NUQVRVUy5FUlJPUixcbiAgICAgICAgICBlcnJvckRlc2NyLFxuICAgICAgICAgIGVycm9yTGFiZWwsXG4gICAgICAgICAgZXJyb3JCb2R5LFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgIGlkOiBGSVhFRF9JRlJBTUVfTUVTU0FHRV9JRFMuTEFURVNUX0hZRFJBVElPTl9FUlJPUl9TVEFUVVMsXG4gICAgICAgICAgc3RhdHVzOiBTVE9SWUJPQVJEX0hZRFJBVElPTl9TVEFUVVMuT1RIRVJfRVJST1IsXG4gICAgICAgICAgZXJyb3JEZXNjcixcbiAgICAgICAgICBlcnJvckxhYmVsLFxuICAgICAgICAgIGVycm9yQm9keSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgICBpZDogRklYRURfSUZSQU1FX01FU1NBR0VfSURTLkxBVEVTVF9IWURSQVRJT05fRVJST1JfU1RBVFVTLFxuICAgICAgICBzdGF0dXM6IFNUT1JZQk9BUkRfSFlEUkFUSU9OX1NUQVRVUy5OT19FUlJPUixcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICAvLyBAdHMtaWdub3JlXG4gIHdpbmRvdy50cmlnZ2VyRHJhZ1N0YXJ0ID0gKHBhcmVudFBvcnQ6IGFueSwgc3Rvcnlib2FyZElkOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBzZWxlY3RlZEVsZW1lbnRLZXkgPSBnZXRNZW1vcnlTdG9yYWdlSXRlbShTRUxFQ1RFRF9FTEVNRU5UX0tFWSk7XG4gICAgY29uc3QgZWxlbWVudEtleVRvTmF2Tm9kZSA9XG4gICAgICBnZXRNZW1vcnlTdG9yYWdlSXRlbShFTEVNRU5UX0tFWV9UT19OQVZfTk9ERSkgfHwge307XG5cbiAgICAvLyBTb21ldGhpbmcgaGFzIHRvIGJlIHNlbGVjdGVkIHRvIHRyaWdnZXIgYSBkcmFnIHN0YXJ0XG4gICAgaWYgKCFzZWxlY3RlZEVsZW1lbnRLZXkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkcmFnZ2VkTmF2Tm9kZSA9IGVsZW1lbnRLZXlUb05hdk5vZGVbc2VsZWN0ZWRFbGVtZW50S2V5XTtcblxuICAgIGNvbnN0IHBhcmVudERvbUVsZW1lbnQgPSBnZXRQYXJlbnREb21FbGVtZW50Rm9yTmF2Tm9kZShkcmFnZ2VkTmF2Tm9kZSk7XG5cbiAgICBjb25zdCBzZWxlY3RlZEVsZW1lbnQgPSAkKFxuICAgICAgYC4ke0VMRU1FTlRfS0VZX1BSRUZJWH0ke3NlbGVjdGVkRWxlbWVudEtleX1gLFxuICAgICkuZ2V0KDApO1xuXG4gICAgY29uc3QgbW91c2VEcmFnQ29udGV4dDogYW55ID0ge1xuICAgICAgLy8gU3RhcnQgb2ZmIHNjcmVlbiwgdGhpcyB3aWxsIGdldCB1cGRhdGVkIGJ5IG9uTW91c2VNb3ZlXG4gICAgICBwYWdlWDogLTEwMDAwLFxuICAgICAgcGFnZVk6IC0xMDAwMCxcblxuICAgICAgLy8gVGhlIGRpZmZlcmVuY2UgYmV0d2VlbiB3aGVyZSB0aGUgdXNlciBjbGlja2VkIGFuZCB0aGUgY2VudGVyIG9mIHRoZSBlbGVtZW50XG4gICAgICBvZmZzZXRYOiAwLFxuICAgICAgb2Zmc2V0WTogMCxcblxuICAgICAgZHJhZ2dpbmc6IHRydWUsXG5cbiAgICAgIHNlbGVjdGVkUGFyZW50RGlzcGxheTogY3NzRXZhbChwYXJlbnREb21FbGVtZW50LCAnZGlzcGxheScpLFxuICAgICAgc2VsZWN0ZWRQYXJlbnRGbGV4RGlyZWN0aW9uOiBjc3NFdmFsKHBhcmVudERvbUVsZW1lbnQsICdmbGV4LWRpcmVjdGlvbicpLFxuICAgIH07XG5cbiAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbSgnbW91c2VEcmFnQ29udGV4dCcsIG1vdXNlRHJhZ0NvbnRleHQpO1xuXG4gICAgLy8gVHJpZ2dlciB0aGUgZHJhZyBzdGFydCBldmVudFxuICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgaWQ6IEZJWEVEX0lGUkFNRV9NRVNTQUdFX0lEUy5EUkFHX1NUQVJUX0VWRU5ULFxuICAgICAgZXZlbnQ6IG1vdXNlRHJhZ0NvbnRleHQsXG4gICAgICBvdXRlckhUTUw6IHNlbGVjdGVkRWxlbWVudD8ub3V0ZXJIVE1MLFxuICAgIH0pO1xuXG4gICAgdXBkYXRlT3V0bGluZXMocGFyZW50UG9ydCwgc3Rvcnlib2FyZElkKTtcbiAgfTtcblxuICAvLyBAdHMtaWdub3JlXG4gIHdpbmRvdy50cmlnZ2VyRHJhZ0NhbmNlbCA9IChwYXJlbnRQb3J0OiBhbnksIHN0b3J5Ym9hcmRJZDogc3RyaW5nKSA9PiB7XG4gICAgc2V0TWVtb3J5U3RvcmFnZUl0ZW0oJ21vdXNlRHJhZ0NvbnRleHQnLCBudWxsKTtcblxuICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgaWQ6IEZJWEVEX0lGUkFNRV9NRVNTQUdFX0lEUy5EUkFHX0NBTkNFTF9FVkVOVCxcbiAgICAgIGV2ZW50OiB7fSxcbiAgICB9KTtcblxuICAgIHVwZGF0ZU91dGxpbmVzKHBhcmVudFBvcnQsIHN0b3J5Ym9hcmRJZCk7XG4gIH07XG5cbiAgLy8gQHRzLWlnbm9yZVxuICB3aW5kb3cuc2V0SXNGbHVzaGluZyA9IChcbiAgICBwYXJlbnRQb3J0OiBhbnksXG4gICAgc3Rvcnlib2FyZElkOiBzdHJpbmcsXG4gICAgaXNGbHVzaGluZzogYm9vbGVhbixcbiAgKSA9PiB7XG4gICAgY29uc3Qgd2FzRmx1c2hpbmcgPSBnZXRNZW1vcnlTdG9yYWdlSXRlbShJU19GTFVTSElORyk7XG5cbiAgICBzZXRNZW1vcnlTdG9yYWdlSXRlbShJU19GTFVTSElORywgaXNGbHVzaGluZyk7XG5cbiAgICBpZiAoaXNGbHVzaGluZyAmJiAhd2FzRmx1c2hpbmcpIHtcbiAgICAgIG9uRmx1c2hTdGFydCgpO1xuICAgIH1cbiAgfTtcbn07XG4iXX0=