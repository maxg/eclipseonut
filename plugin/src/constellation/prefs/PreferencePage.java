package constellation.prefs;

import static constellation.prefs.Preferences.Key.HOST;
import static constellation.prefs.Preferences.Key.HTTP_PORT;
import static constellation.prefs.Preferences.Key.WS_PORT;

import org.eclipse.jface.preference.FieldEditorPreferencePage;
import org.eclipse.jface.preference.IntegerFieldEditor;
import org.eclipse.jface.preference.StringFieldEditor;
import org.eclipse.ui.IWorkbench;
import org.eclipse.ui.IWorkbenchPreferencePage;

import constellation.Activator;

/**
 * Preferences GUI.
 */
public class PreferencePage extends FieldEditorPreferencePage implements IWorkbenchPreferencePage {
    
    public PreferencePage() {
        super(GRID);
        setPreferenceStore(Activator.getDefault().getPreferenceStore());
        setDescription("Constellation connection preferences");
    }
    
    @Override
    protected void createFieldEditors() {
        addField(new StringFieldEditor(HOST.key, "Host", getFieldEditorParent()));
        addField(new IntegerFieldEditor(HTTP_PORT.key, "HTTP port", getFieldEditorParent()));
        addField(new IntegerFieldEditor(WS_PORT.key, "WebSocket port", getFieldEditorParent()));
    }
    
    @Override
    public void init(IWorkbench workbench) { }
}
