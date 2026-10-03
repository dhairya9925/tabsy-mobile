const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withQuickAdd(config) {
  // 1. Android Manifest permissions, service, activity, and receiver
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    const requiredPermissions = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ];

    requiredPermissions.forEach((permission) => {
      const exists = androidManifest['uses-permission'].some(
        (item) => item.$['android:name'] === permission
      );
      if (!exists) {
        androidManifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    const application = androidManifest.application[0];

    if (!application.service) {
      application.service = [];
    }
    const serviceExists = application.service.some(
      (s) => s.$['android:name'] === 'com.tabsy.app.quickadd.QuickAddService'
    );
    if (!serviceExists) {
      application.service.push({
        $: {
          'android:name': 'com.tabsy.app.quickadd.QuickAddService',
          'android:foregroundServiceType': 'specialUse',
          'android:exported': 'false',
        },
        property: [
          {
            $: {
              'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
              'android:value': 'Quick expense entry floating overlay notification',
            },
          },
        ],
      });
    }

    if (!application.activity) {
      application.activity = [];
    }
    const activityExists = application.activity.some(
      (a) => a.$['android:name'] === 'com.tabsy.app.quickadd.QuickAddOverlayActivity'
    );
    if (!activityExists) {
      application.activity.push({
        $: {
          'android:name': 'com.tabsy.app.quickadd.QuickAddOverlayActivity',
          'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
          'android:exported': 'false',
          'android:launchMode': 'singleInstance',
        },
      });
    }

    if (!application.receiver) {
      application.receiver = [];
    }
    const receiverExists = application.receiver.some(
      (r) => r.$['android:name'] === 'com.tabsy.app.quickadd.BootReceiver'
    );
    if (!receiverExists) {
      application.receiver.push({
        $: {
          'android:name': 'com.tabsy.app.quickadd.BootReceiver',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.intent.action.BOOT_COMPLETED',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });

  // 2. Dangerous mod to copy Kotlin source files into the prebuilt Android project
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const sourceDir = path.join(config.modRequest.projectRoot, 'plugins', 'android-src', 'quickadd');
      const targetDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        'com',
        'tabsy',
        'app',
        'quickadd'
      );

      if (fs.existsSync(sourceDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        const files = fs.readdirSync(sourceDir);
        for (const file of files) {
          const srcFile = path.join(sourceDir, file);
          const destFile = path.join(targetDir, file);
          fs.copyFileSync(srcFile, destFile);
        }
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withQuickAdd;
