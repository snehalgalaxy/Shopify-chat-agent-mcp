import pexpect
import sys

def run():
    child = pexpect.spawn('npm run dev', encoding='utf-8', timeout=None)
    child.logfile_read = sys.stdout
    try:
        index = child.expect(['(?i)password', pexpect.EOF], timeout=60)
        if index == 0:
            child.sendline('admin')
            # Wait indefinitely since it's a dev server
            child.expect(pexpect.EOF)
    except pexpect.TIMEOUT:
        print("Timeout or no password prompt detected")
        # still try to expect EOF to keep running if it didn't prompt
        child.expect(pexpect.EOF)
    except pexpect.EOF:
        pass

if __name__ == '__main__':
    run()
