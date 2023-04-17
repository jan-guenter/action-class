import type { FeatherIconNames } from 'feather-icons';

export interface ActionYmlInputData {
  description: string;
  required?: boolean;
  default?: string;
  deprecationMessage?: string;
}

export interface ActionYmlOutputData {
  description: string;
}

export interface ActionYmlOutputDataComposite extends ActionYmlOutputData {
  value: string;
}

export type ActionYmlBrandingColors = 'white' | 'yellow' | 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray-dark';

export type FeatherBrandIconNames =
  | 'amazon'
  | 'apple'
  | 'appstore'
  | 'behance'
  | 'discord'
  | 'dribbble'
  | 'facebook'
  | 'figma'
  | 'github'
  | 'google'
  | 'google-play'
  | 'instagram'
  | 'linkedin'
  | 'medium'
  | 'microsoft'
  | 'patreon'
  | 'pinterest'
  | 'reddit'
  | 'skype'
  | 'slack'
  | 'snapchat'
  | 'telegram'
  | 'tiktok'
  | 'tumblr'
  | 'twitch'
  | 'twitter'
  | 'vimeo'
  | 'whatsapp'
  | 'youtube'
  | 'zoom';

export type ActionYmlBrandingIconExcludes =
  | FeatherBrandIconNames
  | 'coffee'
  | 'columns'
  | 'divide-circle'
  | 'divide-square'
  | 'divide'
  | 'frown'
  | 'hexagon'
  | 'key'
  | 'meh'
  | 'mouse-pointer'
  | 'smile'
  | 'tool'
  | 'x-octagon';

export type ActionYmlBrandingIconNames = Exclude<FeatherIconNames, ActionYmlBrandingIconExcludes>;

export interface ActionYmlBranding {
  icon: ActionYmlBrandingIconNames;
  color: ActionYmlBrandingColors;
}

export interface ActionYmlCommon {
  name: string;
  description: string;
  author?: string;
  inputs?: Record<string, ActionYmlInputData>;
  branding?: ActionYmlBranding;
}

export interface ActionYmlCompositeStepCommon {
  'name'?: string;
  'id'?: string;
  'if'?: string;
  'working-directory'?: string;
  'env'?: Record<string, string>;
}

export interface ActionYmlCompositeStepRun extends ActionYmlCompositeStepCommon {
  run: string;
  shell: string;
}

export interface ActionYmlCompositeStepUses extends ActionYmlCompositeStepCommon {
  uses: string;
  with?: Record<string, string>;
}

export type ActionYmlCompositeStep = ActionYmlCompositeStepRun | ActionYmlCompositeStepUses;

export interface ActionYmlComposite extends ActionYmlCommon {
  outputs?: Record<string, ActionYmlOutputDataComposite>;
  runs: {
    using: 'composite';
    steps: Record<string, ActionYmlCompositeStep>;
  };
}

export interface ActionYmlDocker extends ActionYmlCommon {
  outputs?: Record<string, ActionYmlOutputData>;
  runs: {
    'using': 'docker';
    'image': string;
    'args'?: string[];
    'env'?: Record<string, string>;
    'volumes'?: string[];
    'entrypoint'?: string;
    'pre-entrypoint'?: string;
    'post-entrypoint'?: string;
  };
}

export interface ActionYmlJavascript extends ActionYmlCommon {
  outputs?: Record<string, ActionYmlOutputData>;
  runs: {
    'using': 'node12' | 'node16';
    'main': string;
    'pre'?: string;
    'pre-if'?: string;
    'post'?: string;
    'post-if'?: string;
  };
}

export type ActionYml = ActionYmlComposite | ActionYmlDocker | ActionYmlJavascript;
