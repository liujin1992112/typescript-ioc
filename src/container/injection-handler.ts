import { InstanceFactory } from './container-instance-factory';

/**
 * Utility class to handle injection behavior on class decorations.
 */
export class InjectorHandler {
    public static constructorNameRegEx = /function (\w*)/;

    public static instrumentConstructor(source: Function) {
        let newConstructor: any;
        // tslint:disable-next-line:class-name
        newConstructor = class ioc_wrapper extends (source as FunctionConstructor) {
            constructor(...args: Array<any>) {
                super(...args);
                InjectorHandler.assertInstantiable(source);
            }
        };
        newConstructor['__parent'] = source;
        InjectorHandler.blockInstantiation(source);
        return newConstructor;
    }

    public static blockInstantiation(source: Function) {
        source['__block_Instantiation'] = true;
    }

    public static unblockInstantiation(source: Function) {
        source['__block_Instantiation'] = false;
    }

    public static getConstructorFromType(target: Function): FunctionConstructor {
        let typeConstructor: any = target;
        if (this.hasNamedConstructor(typeConstructor)) {
            return typeConstructor as FunctionConstructor;
        }
        typeConstructor = typeConstructor['__parent'];
        while (typeConstructor) {
            if (this.hasNamedConstructor(typeConstructor)) {
                return typeConstructor as FunctionConstructor;
            }
            typeConstructor = typeConstructor['__parent'];
        }
        throw TypeError('Can not identify the base Type for requested target ' + target.toString());
    }

    public static checkType(source: Object) {
        if (!source) {
            throw new TypeError('Invalid type requested to IoC ' +
                'container. Type is not defined.');
        }
    }

    public static injectProperty(target: Function, key: string, propertyType: Function, instanceFactory: InstanceFactory) {
        const propKey = `__${key}`;
        Object.defineProperty(target.prototype, key, {
            enumerable: true,
            get: function () {
                return this[propKey] ? this[propKey] : this[propKey] = instanceFactory(propertyType);
            },
            set: function (newValue) {
                this[propKey] = newValue;
            }
        });
    }

    private static hasNamedConstructor(source: Function): boolean {
        if (source['name']) {
            return source['name'] !== 'ioc_wrapper';
        } else {
            try {
                const constructorName = source.prototype.constructor.toString().match(this.constructorNameRegEx)[1];
                return (constructorName && constructorName !== 'ioc_wrapper');
            } catch {
                // make linter happy
            }

            return false;
        }
    }

    private static assertInstantiable(target: any) {
        if (target['__block_Instantiation']) {
            throw new TypeError('Can not instantiate it. The instantiation is blocked for this class. ' +
                'Ask Container for it, using Container.get');
        }
    }
}