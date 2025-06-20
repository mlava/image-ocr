Use tesseract.js to examine and extract text from images in your Roam Research graph.

If you often take photos of poweerpoint presentations to save them for later, you'll understand the need to be able to extract text from those images. Using this extension you can extract text from an image or series of images and apply the recognised text as a child block to the image.

There are several ways you can achieve this with this extension:
1. Block context menu - Extensions / 'Get Text from Images (OCR) in selected block(s)'
2. Block context menu - Extensions / 'Get Text from Images (OCR) in child blocks'
3. Multiselect menu - Plugins / 'Get Text from Images (OCR) in selected block(s)'

You can see this in this gif:

Screen Recording 2025-06-20 at 10.44.04 am.gif

The extension checks each selected block for the presence of an image tag. If there aren't any image tags nothing will happen. If it recognises an image tag it will attempt to recognise text and then apply as a child block.

You can specify the recognition language in the Roam Depot settings, or it will default to English. You can also set a confidence threshold. Tesseract.js reports how confident it is in the text extracted. If you set a confidence threshold and the recognition confidence is below that level, the text won't be applied to your graph.

In the case of a single block, toasts will be shown if the extension fails to recognise text in the image or the confidence level is below your set confidence threshold. If you run the extension on multiple blocks the toasts are disabled (stops toast spam on screen). It might be worth testing your language and confidence settings on single images until you're satisfied you have the settings refined.
