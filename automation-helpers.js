/**
 * Executes a script in the page's main world context.
 * @param {number} tabId - The ID of the tab to execute the script in.
 * @param {Function} func - The function to execute.
 * @param {Array} [args] - Arguments to pass to the function.
 * @returns {Promise<any>}
 */
export async function executeScript(tabId, func, args = []) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func,
    args,
  });
  return results[0].result;
}

/**
 * A simple promise-based delay.
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise<void>}
 */
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Polls for a condition to be true on the target page.
 * @param {number} tabId - The ID of the tab to poll.
 * @param {Function} conditionFunc - The function to execute on the page, should return true when condition is met.
 * @param {Array} [args=[]] - Arguments to pass to the condition function.
 * @param {number} [timeout=10000] - The total time to wait in ms.
 * @param {number} [interval=500] - The interval between checks in ms.
 * @returns {Promise<void>}
 */
export async function pollPage(tabId, conditionFunc, args = [], timeout = 10000, interval = 500) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await executeScript(tabId, conditionFunc, args)) {
      return;
    }
    await wait(interval);
  }
  throw new Error('Polling timed out.');
}